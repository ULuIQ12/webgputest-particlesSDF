# webgputest-particlesSDF


A first few tests regarding the use of TSL, 
Look in 
. lib/Root.ts for basic renderer / renderloop setup
. lib/elements/ParticlesSDF for the implementation
. lib/nodes and lib/display for the nodes


## Getting Started

To start the development environment for this project, follow these steps:

1. Clone the repository to your local machine:

  ```bash
  git clone https://github.com/ULuIQ12/webgputest-particlesSDF.git
  ```

2. Navigate to the project directory:

  ```bash
  cd webgputest-particlesSDF
  ```

3. Install the dependencies:

  ```bash
  npm install
  ```

4. Start the development server:

  ```bash
  npm run dev
  ```

  This will start the development server and open the project in your default browser.

## Building the Project
Edit the base path in vite.config.ts

To build the project for production, run the following command:

```bash
npm run build
```

This will create an optimized build of the project in the `dist` directory.


## Features

- A failed port of the UnrealBloomPass from three.js
- a conformToSDF node inspired by the one in Unity VFXGraph
- a turbulence node, just a wrapper on the fractal noise in TSL
- particles in TSL compute, with automatic fallback to webgl2

## Acknowledgements
SDF functions from Inigo Quilez https://iquilezles.org/
Three.js of course! https://threejs.org/
lil-gui https://lil-gui.georgealways.com/

