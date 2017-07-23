# Helix

## Introduction

What is Helix? In a nutshell: it's a WebGL 3D engine\* built in Javascript.

I didn't build it to compete with other Javascript 3D engines. Building and maintaining 3D engines is a sort of hobby of 
mine. It allows me to experiment much more freely than when I'm confined to an existing engine. I do occasionally use it
for real projects depending on their requirements.

If you're interested in playing around with it, go ahead! Want to go straight ahead and use it in a professional project?
You may want to think twice (and the risk is entirely yours). As the engine is built by me and especially *for myself*, 
you may run into some quirks and pedantries that may be confusing at first. The original code base was ported from a 
personal C++/DirectX project, and since then large parts of the JS version have been rewritten and remolded. Some 
concepts from DirectX (blend/stencil states, vertex layouts, ...) stayed in because they were simply good ideas\*. If 
you're coming from an old-school Flash background, you may also run into approaches that are similar to the original
Away3D "Broomstick" prototype that I developed back in 2010 before it became 4.0.

*(DirectX 10+ is absolutely awesome, I don't care what your friendly local GL-only fanboi says)*

In any case, I think it's worth making things open source. There may always be things to learn and teach doing so.

Some aspects of note:
* The 3D engine uses a left-handed system, where X points "right", Y "up", and Z **into** the screen. This may be the 
opposite of most GL-based systems, but it allows for a consistent notion where positive Z means forward. Always.
* The engine is built using the Entity/Component model. This means objects in the Scene are Entities that can have
Components registered to them, defining modular behaviour. More information on this in the documentation. 
* Materials are strictly split up in "geometry" code and "lighting model" code. You can focus on writing uncluttered 
geometry code that.
* Some aspects may or may not be supported by the device (hdr rendering). The engine will catch this automatically, but 
in most cases it's good to provide alternative solutions. Lack of HDR support or adaptive tone mapping may require a 
different lighting setup.
* The engine is built with both deferred and forward rendering paths.
* "Bones" (used in skinned animations) are *always* named "joints". It's more correct, and I'm a pedant. There!
* More pedantry: adding and removing children to a scene graph node is called "attaching" and "detaching". I feel it
describes more accurately what the relationship between child/parent is.


 \* *Actually, it's built as a game engine, but only the rendering and animation engine has been implemented at this 
 point.*


## Getting started

The easiest way to get started is just grabbing and including the `.js` files in the `build` folder. Take a look at
`examples/hello-world` to see how to create a simple scene and render it (the other examples hide a lot of boilerplate
code).

Some important things to note:
* `HX.init(yourDOMCanvas)` needs to be called *before anything else!*
* You do not need to call `requestAnimationFrame`. Helix handles this internally and exposes the `HX.onFrame` Signal.
Just bind a function to it, and it will be called every frame.

With this, you're ready to explore the other examples. Easy ones to start:
- `primitive-texture`
- `primitive-dir-light`
- `primitives`
- `env-map-equirectangular`
- `ggx-lighting`
- `io-md5`
- `sibenik-obj`
- `specular-properties`

## Building

If you want to change code and re-build the project yourself? Helix's compilation process uses Node.js, npm, and gulp,
so be sure to have those installed. Then, in a terminal, simply perform the following steps in the helix directory:
```
npm install -g gulp
npm install
```
This will make sure all dependencies are installed. Unless any dependencies change, you need to do this only once.

Then, to compile:
```
gulp
```
The newly built files will end up in the `build` folder. 

If anything goes wrong, make sure you have the latest versions of Node.js and npm installed!

## Modules

Helix is divided into several modules, each having their own directory in the src folder and are built to separate files 
to prevent optional functionality bloating your Javascript includes. Currently these are the following:
- `helix-core`: the module containing the basic game engine and essential functionality.
- `helix-io`: the module containing non-essential importers.