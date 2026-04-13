---
title: 'DX12 Smoke simulator'
description: 'Some simulation through HLSL compute shaders and ray marching'
releaseDate: 'Jan 16 2026'
category: 'BUas'
tags: ['buas', 'mini-engine', 'dx12', 'simulation', 'compute']
version: 'v1.0'
language: 'C++, HLSL'
engine: 'MiniEngine'
grade: 61
---

See my [blog](/blog/smoke-simulation) for an in-depth look into thee physics and simulation. This page shows aspects related to the implementation.

## Overview

This project was part of the second project of Year 2 at BUas. I was tasked to research a topic of my choosing for which I chose to dive into smoke simulation. Using Microsoft's [MiniEngine](https://github.com/microsoft/DirectX-Graphics-Samples/tree/master/MiniEngine) I made my own module to simulate smoke in a single bound.

I implemented the entire fluid simulation through the use of compute shaders and 3D textures and implemented a debug view with the use of indirect draw calls.

## MAC Solver Compute pipeline
The pipeline works on the following set of buffers:
- `TypeBuffer` (R8_UINT): Holds the type of each cell (`EMPTY`, `FLUID` or `SOLID`)
- `PressureBuffer` (R32_FLOAT): Self-explanatory.
- `VelocityXBuffer` (R32_FLOAT): Holds the X velocity of all left edges of the cells.
- `VelocityYBuffer` (R32_FLOAT): Holds the Y velocity of all top edges of the cells.
- `VelocityZBuffer` (R32_FLOAT): Holds the Z velocity of all back edges of the cells.
- `FluidBuffer` (R32_FLOAT): Holds the density of the fluid at all cells.
- `TemperatureBuffer` (R32_FLOAT): Self-explanatory.
- `VorticityBuffer` (R32_FLOAT): Self-explanatory.
- `TempBuffer[1-3]` (R32_FLOAT): Hold temporary data (depends on stage).

First, the type buffer is cleared whereafter all compute shaders are ran in the order described below.

### Spawner
The spawner shader gets run before the simulation and inserts temperature and density into the buffers based on spawner parameters set through code or the Engine Tuning menu.

### Obstacle
First, all obstacles are loaded into a `StructuredBuffer` from which all cells inside that obstacle are set to `SOLID`.

### Type
Afterwards, the type determination shader fills in the type buffer. Solid cells are skipped and cells with > 0.001 density are marked `FLUID`. This type buffer is then used by some shaders to prune work.

### Negative Divergence cache
To speed up the pressure solver, I write the negative divergence of all cells to `TempBuffer1`, which the pressure solver can use to speed up its calculations.
```hlsl
[numthreads(MAC_GROUP_SIZE, MAC_GROUP_SIZE, MAC_GROUP_SIZE)]
void main(uint3 tId : SV_DispatchThreadID)
{
	// snip...

	float velocity = 0.f;

	velocity += MAC::VelocityXBuffer[tId + uint3(1, 0, 0)];
	velocity -= MAC::VelocityXBuffer[tId];

	velocity += MAC::VelocityYBuffer[tId + uint3(0, 1, 0)];
	velocity -= MAC::VelocityYBuffer[tId];

	velocity += MAC::VelocityZBuffer[tId + uint3(0, 0, 1)];
	velocity -= MAC::VelocityZBuffer[tId];

	MAC::DivergenceBuffer[tId] = -density * deltaX * velocity / deltaTime;
}
```

### Pressure solver
The pressure solver then uses the negative divergence to calculate the pressure on each cell. Boundary conditions are also taken into account. I use a method that cancels all pressure differences on an axis if one of the cells is at the border. I found this to be the most stable method.
```hlsl
/*
 * Right
 */
uint3 right = center + uint3(1, 0, 0);
if (iAmSolid || MAC::TypeBuffer[right] == SOLID)
{
    // Boundary
    px = 0.0;
    pxBlocked = true;
}
else
    px += MAC::PressureBuffer[right];
/*
 * Left
 */
uint3 left = center + uint3(-1, 0, 0);
if (iAmSolid || MAC::TypeBuffer[left] == SOLID)
{
    // Boundary
    px = 0.0;
}
else if (!pxBlocked)
    px += MAC::PressureBuffer[left];
```

### Vorticity cache
This shader caches the $\omega$ term in the vorticity calculation to relieve the velocity calculation.

### Velocity solver
This is where all stages come into play. The velocity is determined by the difference in pressure whereafter external forces are applied (buoyancy and vorticity).
```hlsl
float3 GetDensities(uint3 center, uint3 res)
{
	// Buoyancy
	float Tc = MAC::TemperatureBuffer[center];
	float Tx = Tc - SafeLoadTemp(center + int3(-1, 0, 0), res);
	float Ty = Tc - SafeLoadTemp(center + int3(0, -1, 0), res);
	float Tz = Tc - SafeLoadTemp(center + int3(0, 0, -1), res);

	float sc = MAC::FluidBuffer[center];
	float sx = sc - SafeLoadFluid(center + int3(-1, 0, 0), res);
	float sy = sc - SafeLoadFluid(center + int3(0, -1, 0), res);
	float sz = sc - SafeLoadFluid(center + int3(0, 0, -1), res);

	return max(float3(
		AIR_DENSITY * (1.0 + BUOY_ALPHA * sx - BUOY_BETA * Tx),
		AIR_DENSITY * (1.0 + BUOY_ALPHA * sy - BUOY_BETA * Ty),
		AIR_DENSITY * (1.0 + BUOY_ALPHA * sz - BUOY_BETA * Tz)
	), 0.05 * AIR_DENSITY);
}

void UpdateVelocity(uint3 center, uint3 res)
{
	const float3 densities = GetDensities(center, res);

	const float3 k = deltaTime.xxx / (densities * deltaX);

	const float centerPressure = MAC::PressureBuffer[center];

	uint3 left = center + uint3(-1, 0, 0);
	if ((center.x == 0 || center.x == res.x) && center.y < res.y && center.z < res.z)
		MAC::VelocityXBuffer[center] = 0.0;
	else if (MAC::TypeBuffer[left] != SOLID)
		MAC::VelocityXBuffer[center] -= k.x * (centerPressure - MAC::PressureBuffer[left]);

	// etc. for Y and Z
}

static const float VORTICITY_EPSILON = 0.8;
void ApplyExternalForces(uint3 center, uint3 res)
{
	// Buoyancy
	float Tc = MAC::TemperatureBuffer[center];
	float Ty = 0.5 * (Tc + SafeLoadTemp(center + int3(0, -1, 0), res));

	float sc = MAC::FluidBuffer[center];
	float sy = 0.5 * (sc + SafeLoadFluid(center + int3(0, -1, 0), res));

	static const float G = -9.81;

	MAC::VelocityYBuffer[center] += deltaTime * (BUOY_ALPHA * sy - BUOY_BETA * Ty) * G;

	// Vorticity
	// R. Fedkiw, J. Stam, H.W. Jensen, "Visual simulation of smoke", 2001
	// https://dl.acm.org/doi/pdf/10.1145/383259.383260
	float3 eta;
	eta.x = (SafeLoadVortMag(center + int3(1,0,0), res) - SafeLoadVortMag(center - int3(1,0,0), res)) * 0.5;
	eta.y = (SafeLoadVortMag(center + int3(0,1,0), res) - SafeLoadVortMag(center - int3(0,1,0), res)) * 0.5;
	eta.z = (SafeLoadVortMag(center + int3(0,0,1), res) - SafeLoadVortMag(center - int3(0,0,1), res)) * 0.5;

	float3 N = normalize(eta + 1e-6);
	float3 omega = MAC::VorticityBuffer[center].xyz;

	float3 force = VORTICITY_EPSILON * cross(N, omega);
	MAC::VelocityXBuffer[center] += deltaTime * force.x;
	MAC::VelocityYBuffer[center] += deltaTime * force.y;
	MAC::VelocityZBuffer[center] += deltaTime * force.z;
}


[RootSignature(MAC_RootSig)]
[numthreads(MAC_GROUP_SIZE, MAC_GROUP_SIZE, MAC_GROUP_SIZE)]
void main(uint3 tId : SV_DispatchThreadID)
{
	uint width;
	uint height;
	uint depth;
	MAC::TypeBuffer.GetDimensions(width, height, depth);
	if (tId.x > width || tId.y > height || tId.z > depth)
		return;

	UpdateVelocity(tId, uint3(width, height, depth));

	// Skip any that is outside. Sampling the temperature and concentration should return 0 in this case
	if (tId.x == width || tId.y == height || tId.z == depth)
		return;

	ApplyExternalForces(tId, uint3(width, height, depth));
}
```

### Advection shaders
Finally, both velocity and temperature are advected. For both shaders, the value found by backtracking one timestep based on velocity is written in a temporary buffer which then gets copied over to the relevant buffer.

## Ray marching
I won't show the entire shader, since it is a pretty basic ray marching algorithm. General details can be found in the [blog](/blog/smoke-simulation).

Each step of the marcher sampels the `FluidBuffer` for the density. Then, I offset the sampled position by the velocity multiplied by a noise animation timer. I use the same noise as used by $\mathrm{Nubis^3}$.
```hlsl
float3 vel = GetVelocity(gridPos, UVX, UVY, UVZ);
samplePos += vel * timer * 0.1;

// Code from VoxelCloudSampler.cg
// https://bit.ly/NubisVoxelCloudPack
float4 noise = NubisNoise.SampleLevel(NoiseSampler, samplePos * 0.1, 0.0);
float wispyNoise = lerp(noise.r, noise.g, dimensionalProfile);
float billowyTypeGradient = pow(dimensionalProfile, 0.25);
float billowyNoise = lerp(noise.b * 0.3, noise.a * 0.3, billowyTypeGradient);

float noiseComposite = lerp(wispyNoise, billowyNoise, sample);

float uprezzedDensity = ValueErosion(sample, noiseComposite);
float poweredDensity = Square(sample);

uprezzedDensity *= poweredDensity;
uprezzedDensity = pow(uprezzedDensity, lerp(0.3, 0.6, max(0.0001, poweredDensity)));

accumulatedDensity += uprezzedDensity * inStep;
```

To make the smoke look like actual smoke, I apply a blue noise jitter to each step of the march
```hlsl
float stepJitter = BlueNoise.SampleLevel(NoiseSampler, float3((float2)tId / 64.0, i * 0.1), 0.0);
t += ((inside) ? inStep : outStep) * (0.5 + stepJitter * 0.5);
```

## Debug mode
I implemented a voxel-based debugging mode that allows me to see what all values are.
<figure>
    <img alt="Voxel Debugging" src="/project-images/smoke-simulation/voxel-debug.png"/>
    <figcaption>Voxel debugging view</figcaption>
</figure>

I implemented it through first culling all voxels that are not needed and storing the needed instances in an instance list and indirect draw args buffer.
```hlsl
RWStructuredBuffer<VoxelInstance> VisibleVoxels : register(u0);
RWByteAddressBuffer IndirectArgs : register(u1);  // For DrawIndexedInstanced

// Increment instance count
uint index;
IndirectArgs.InterlockedAdd(4, 1, index);

// Add instance to the visible ones
VoxelInstance inst;
inst.padding = 0;
inst.loc = tId;
inst.color = color;
VisibleVoxels[index] = inst;
```
Then I just render the voxels using indirect indexed draw
```cpp
ctx.DrawIndirectIndexed(m_indirectDrawArgs);
```

## GPU Profiling
This block was the first time I properly profiled and optimised shaders. I used NVIDIA's Nsight Graphics for tracing the GPU. For the MAC pipeline I went from this baseline

<img alt="Profiling baseline" src="/project-images/smoke-simulation/mac-baseline.png"/>

to this optimised version

<img alt="Profiling optimised" src="/project-images/smoke-simulation/mac-typeu8.png"/>

Please note that these are not at all good measures, since I added buoyancy and vorticity between these two captures.

The gain is not per se great. My shared memory approach did not work, since I eventually got some calculations to be unsynced and there is no way to sync _all_ threads of a dispatch.