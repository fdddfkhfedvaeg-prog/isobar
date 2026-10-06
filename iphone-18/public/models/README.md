Put production GLB models here, versioned by filename (`phone.v1.glb`), and point
`VITE_PHONE_GLB_URL=/models/phone.v1.glb` at one. Compress before committing:

    npx @gltf-transform/cli optimize in.glb phone.v1.glb --compress draco --texture-compress webp

Authoring contract (see src/three/GlbPhone.tsx): materials named `Frame` and `Back`
take the colorway; nodes with a numeric custom property `explode` slide along Z.
