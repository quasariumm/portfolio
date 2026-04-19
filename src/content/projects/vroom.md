---
title: 'Vroom'
description: 'A racing-focused engine made by a team of 7 at BUas'
coverImageCredit: 'Donna Weerdenburg'
releaseDate: 'Apr 10 2026'
category: 'BUas'
tags: ['buas', 'custom-engine', 'bee', 'dx12', 'ps5', 'pbr']
version: 'v1.0'
language: 'C++, HLSL, PS5 Shaders, Python, GitHub Actions YAML'
engine: 'BEE'
grade: 72
developers: [
    'Ayush Bhardwas|Enging & Tools Programmer',
    'David Boyd|Graphics Programmer',
    'Donna Weerdenburg|Gameplay & Phyics Programmer',
    'Guus Ros|Gameplay & Physics Programmer',
    'Patrick Vreeburg|Graphics Programmer',
    'Quillan Wielhouwer|Engine & Tools Programmer',
    'Tygo van Gorp|Graphics Programmer'
]
---

## Overview

This project was my third project in Year 2 at BUas. I was put in a team of 7 people to make an engine that could make a racing game. As a team, we made and engine in which we made two distinct demos with some distinct features.

### Editor

![Editor](/project-images/vroom/editor.png)

#### Features
##### Engine & Tools
| Feature | Credit |
| :--- | :--- |
| Basic engine | BUas Lecturers & Quillan Wielhouwer |
| Filesystem IO | Ayush Bhardwas |
| Scenes | Ayush Bhardwas |
| Scene graph | Quillan Wielhouwer |
| Prefabs | Ayush Bhardwas |
| Editor menus | Quillan Wielhouwer |
| Packaging | Quillan Wielhouwer |
| Splines | Quillan Wielhouwer |
| FMOD Studio Audio | Patrick Vreeburg |

##### Physics & AI
| Feature | Credit |
| :--- | :--- |
| Arcade vehicle controller | Guus Ros |
| Drifting (Arcade controller) | Guus Ros |
| Car-to-car collision (Arcade controller) | Guus Ros |
| Jolt vehicle controller | Donna Weerdenburg |
| Checkpoints | Guus Ros |
| Item pickups | Donna Weerdenburg |
| Spline-based AI | Quillan Wielhouwer |

##### Graphics
| Feature | Credit |
| :--- | :--- |
| DX12 PBR Rendering | David Boyd |
| PS5 PBR Rendering | Patrick Vreeburg |
| DX12 in-game UI | David Boyd |
| PS5 in-game UI | Tygo van Gorp |
| Post-processing pipeline | Patrick Vreeburg |
| Motion Blur | David Boyd |
| Shadow mapping | Patrick Vreeburg |

### Maro Kart
This Mario Kart-inspired demo features spline-based AI, a custom arcade-like vehicle controller with drifting and item pickups.
<iframe width="100%" height="auto"
src="https://www.youtube.com/embed/kcms5zNpi5U" allowfullscreen>
</iframe>

### Trackman
This Trackmania-inspired demo features an in-game level editor with a Jolt-based vehicle controller.
<iframe width="100%" height="auto"
src="https://www.youtube.com/embed/Wc7HGKH__Vs" allowfullscreen>
</iframe>

## My contributions

### GitHub CI pipeline
Since some of this is under an NDA, I cannot show images here.

To assure that all code added through PRs work on a clean clone of the repo, I added a CI which included linting through clang and build tests for both PC and PS5. I also did some optimisations to assure that the CI build does not take ages. The steps I took to optimise the CI can be seen in the table. The times were recorded on my local machine through building the engine in Debug with the `msbuild` CLI.

| Change | Time on my machine |
| :--- | :--- |
| Baseline | 43s 850ms |
| (CI Only) /Z7 + removed /RTC1 + removed /JMC | 40s 070ms |
| PCH with all file includes optimised | 33s 280ms |
| Turn off /bigobj for engine | 35s 370ms |
| (CI Only) Turn off PDB generation on Debug | 32s 490ms |
| (CI Only) Add /UNITY | 29s 740ms |

### Post-processing pipeline
The post-processing pipeline for Vroom supports some basic effects built into the engine and the option to make your own HLSL shaders. The user-defined shaders make use of Dxc and DXIL to runtime compile and link the HLSL shader to the post-processing pipeline. The video below is relatively old, but the workflow has not changed much from this throughout the project.
<iframe width="100%" height="auto"
src="https://www.youtube.com/embed/1zSoLjvz_Zk" allowfullscreen>
</iframe>

### Shadow mapping
I used a simple 3x3 Gaussian PCF filter on a cascaded shadow map to add shadows to the engine. This was my first time ever doing shadow mapping, so this took a while to get right.
<video width="100%" height="auto" controls>
  <source src="/project-images/vroom/shadow-mapping.mp4" type="video/mp4">
</video>

### FMOD Studio integration
Through the use of the ECS and the engine's trigger box system I made a system for interfacing with FMOD Studio banks. In the engine I expose some components to interface with Studio.

<figure>
    <img alt="Voxel Debugging" src="/project-images/vroom/bank-holder.png"/>
    <figcaption>Associates in .bank and .bank.strings files to the scene</figcaption>
</figure>

<figure>
    <img alt="Voxel Debugging" src="/project-images/vroom/audio-source.png"/>
    <figcaption>Allows for playing a sound or triggering an event on engine-defined triggers</figcaption>
</figure>

<figure>
    <img alt="Voxel Debugging" src="/project-images/vroom/audio-parameter-modulator.png"/>
    <figcaption>Allows for modifying parameters on colliding with a trigger box</figcaption>
</figure>

In Maro Kart these components and a custom system for example modulate the sounds of the car based on the speed of the associated car

![Maro Kart car sounds](/project-images/vroom/maro-car-sounds.png)

### Speedlines (Maro Kart)
These give the player a false sense of speed. The faster the car goes, the more opaque the lines become. I also added the option to specify frames and some parameters regarding the random shifts in position, scale and opacity

![Speedlines](/project-images/vroom/speedlines.png)