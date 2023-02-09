# diffusionlife -- [Demo](https://harryhinch.github.io/diffusionlife/)

Simulation inspired by Tom Mohr's https://particle-life.com/

I have increased the complexity of the function that maps distance to force for each particle from a 3 points to 6 points (including the start and end points). There are now 4 parameters per particle interaction.

The current algorithm that computes the forces on each particle is *highly* inefficient. Wrapping around the borders is done by accounting for 9 possible positions for each particle, simulating a 3x3 square of simulations. Still, this was a fun prototype to make. Performance on Chrome is better than Firefox, it seems.

### Roadmap
- Improve performance with better, cleaner algorithm
- Allow modifying a function parameter
- Saving and loading simulations