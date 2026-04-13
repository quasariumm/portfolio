---
title: 'Rusterizer'
description: 'A software rasterizer made in Rust for the masterclass hosted by Luca Quartesan and Traverse Research.'
releaseDate: 'Feb 9 2026'
category: 'Personal'
tags: ['rust', 'traverse-research', 'software-raster', 'multi-threaded']
version: 'v1.0'
language: 'Rust'
link_github: 'https://github.com/quasariumm/rusterizer'
---

## Overview
Over a period of 3 weeks I worked on making a software raterizer in Rust. The first three days of this consisted of a masterclass held at BUas presented by [Luca Quartesan](https://www.linkedin.com/in/luca-quartesan/). In this masterclass I learned the basics before I was let loose to do my own things.

<iframe width="100%" height="auto"
src="https://www.youtube.com/embed/oLQ54aqasUE?loop=1&autoplay=1&mute=1" allowfullscreen>
</iframe>

There was a competition tied to this project, which I won. As a prize I got this beautiful 3D printed trophy
<img alt="Profiling baseline" src="/project-images/rusterizer/trophy.jpeg"/>

## The engine
I made my own rasterisation engine as a crate for which the idea was to have a module that holds an interface for an app that the user can define their own functions in and a set of basic types related to rendering. A basic explanation of all features can be seen on the [GitHub repo](https://github.com/quasariumm/rusterizer).

I'll go into more detail here on a couple of aspects here.

### Textures
My idea with textures and samplers was to mimic the GPU structs as much as possible. That's why I also made a system that supports a huge variety of texture formats. I achieved this by making use of Enums:
```rs
pub enum TextureDataHolder<T> {
    Linear(Vec<Vec<T>>),
    Morton2D(Vec<ZArray2D<T>>),
    Morton3D(Vec<ZArray3D<T>>),
}

// The size of this is constant, so no memory is wasted
pub enum TextureData {
    U8(TextureDataHolder<u8>),
    U16(TextureDataHolder<u16>),
    U32(TextureDataHolder<u32>),
    U64(TextureDataHolder<u64>),
    U128(TextureDataHolder<u128>),
}
```
The container type is then determined with
```rs
let unpacked_format = unpack_format(config.format);

let data_size = (unpacked_format.0.component_count() * unpacked_format.1.byte_size())
    .next_power_of_two();
```

### Tiled rendering
To achieve tiled rendering properly I needed to optimise the time each bin took to process. I noticed that my main bottleneck was the locking of a mutex. This led to me creating what I call my least sane Rust struct to date
```rs
#[derive(Debug)]
pub struct UnsafeHandle<T> {
    handle: usize,
    owned: bool,
    phantom: PhantomData<T>,
}
```
I read and write to this by casting the `handle` from and to pointers
```rs
pub unsafe fn read(&self) -> &T {
    unsafe { (self.handle as *const T).as_ref().unwrap() }
}

#[allow(clippy::mut_from_ref)]
pub unsafe fn write(&self) -> &mut T {
    unsafe { (self.handle as *mut T).as_mut().unwrap() }
}
```

For my triangle binning struct I also had to cast to and from `usize` to get optimal performance on all threads
```rs
rayon::scope(|s| {
    let bins = self.triangle_bins.as_mut_ptr();

    unsafe {
        for i in 0..self.triangle_bins.len() {
            let bin_handle = bins.add(i) as usize;
            let offset = self.offsets[i].cast::<f32>().unwrap();
            s.spawn(move |_| {
                let bin = (bin_handle as *mut Vec<Triangle>).as_mut().unwrap();

                // snip...
            });
        }
    }
};
```

As one of the colleagues from Traverse already stated this needs a lot of unsafe code to work properly.