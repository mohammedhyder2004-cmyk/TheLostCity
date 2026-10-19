# Custom 3D Explorer Models for Untold: The Lost City

To load your own custom rigged 3D character into the game:

1. Obtain a rigged character model in `.glb` or `.gltf` format:
   - **Mixamo (Free by Adobe)**: [mixamo.com](https://www.mixamo.com/) - Download characters like "Liam", "Malcolm", or "Douglas" wearing explorer/adventure gear. Export as glTF / GLB with "Idle", "Walking", and "Running" animations.
   - **Ready Player Me (Free)**: [readyplayer.me](https://readyplayer.me/) - Create a custom 3D avatar with an olive jacket, dark cargo trousers, and explorer boots, and download the `.glb`.
   - **Kenney Character Assets (CC0)**: [kenney.nl](https://kenney.nl/) - Free stylized adventurer models.
   - **Sketchfab (Free Downloads)**: Search for "Explorer" or "Adventurer" with downloadable and animated filters.

2. Save your model as:
   `public/models/explorer.glb`

3. The game will automatically detect and load `explorer.glb`, scale it to human proportions, enable realistic shadows, bind walk/run/idle animations, and seamlessly attach it to the player controls.

If no file is present at `public/models/explorer.glb`, the game automatically uses the built-in procedural humanoid explorer model with the olive-green jacket, dark cargo trousers, brown backpack, and articulated walk animation.
