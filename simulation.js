// v1.0.0

var FF_RESOLUTION = 4;
var SIM_WIDTH = 1000;
var SIM_HEIGHT = 1000;
var SIM_CHECK_SQDIST = (80 * FF_RESOLUTION)**2;

addControl('SIM_PARTICLES', {
    type: 'slider',
    group: 'sim',
    display_name: 'Particle Count',
    display_unit: '',
    value_min: 10,
    value_default: 250,
    value_max: 500,
    value_step: 1,
});
addControl('FF_DIST_SCALE', {
    type: 'slider',
    group: 'sim',
    display_name: 'Distance Scaling',
    display_unit: 'px',
    value_min: 5,
    value_default: 40,
    value_max: 80,
    value_step: 1,
});
addControl('FF_GLOBAL_SCALE', {
    type: 'slider',
    group: 'sim',
    display_name: 'Force Multiplier',
    display_unit: 'x',
    value_min: 0.005,
    value_default: 0.5,
    value_max: 2,
    value_step: 0.005,
});
addControl('SIM_SPEEDLIMIT', {
    type: 'slider',
    group: 'sim',
    display_name: 'Speed Limit',
    display_unit: 'x',
    value_min: 0.25,
    value_default: 1,
    value_max: 10,
    value_step: 0.05,
});
addControl('SIM_SPEEDDAMPEN', {
    type: 'slider',
    group: 'sim',
    display_name: 'Inverse Speed Dampening',
    display_unit: '',
    value_min: 1,
    value_default: 4,
    value_max: 10,
    value_step: 0.1,
});

addControl('DISP_PARTICLERADIUS', {
    type: 'slider',
    group: 'display',
    display_name: 'Particle Radius',
    display_unit: 'px',
    value_min: 1,
    value_default: 2,
    value_max: 5,
    value_step: 0.1,
});
addControl('DISP_PARTICLEALPHA', {
    type: 'slider',
    group: 'display',
    display_name: 'Particle Alpha',
    display_unit: '',
    value_min: 0,
    value_default: 1,
    value_max: 1,
    value_step: 0.01,
});

var SIM_PARTICLESMAX = 500;
var SIM_PARTICLETYPES = 6;

const COLOR_TYPES = [
    '#FF2200',
    '#00FF00',
    '#4466FF',
    '#FF00FF',
    '#00FFFF',
    '#FFFF00',
]

// index into data array for particles
const PHYS_DATA_SIZE = 5;
const PHYS_X_POS = 0;
const PHYS_Y_POS = 1;
const PHYS_X_VEL = 2;
const PHYS_Y_VEL = 3;
const PHYS_TYPE = 4;


class ForceFunction
{
    constructor() 
    {
        this.data = new Float64Array(FF_RESOLUTION + 2);
        this.init(1);
    }
    init(slowmorph)
    {
        this.data[0] = -1;
        this.data[FF_RESOLUTION-1] = 0;
        for(let i = 1; i<=FF_RESOLUTION; i++)
            this.data[i] = lerp(this.data[i], Math.random()*2-1, slowmorph);
    }
    get(distance)
    {
        // clamp to array boundaries
        const dist = Math.min(FF_RESOLUTION + 1,
                     Math.max(0, distance / FF_DIST_SCALE));
        if(dist >= (FF_RESOLUTION+1)) return 0;
        const index = Math.floor(dist);
        const fractional = dist - index;
        return lerp(this.data[index], this.data[index+1], fractional);
    }
    draw(ctx, x_pos, y_pos, width, height)
    {
        // box
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(x_pos, y_pos, width, height);
        ctx.stroke();

        // x axis
        ctx.strokeStyle = "#8886";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x_pos,y_pos+height/2);
        ctx.lineTo(x_pos+width,y_pos+height/2);
        ctx.stroke();

        // graph
        ctx.lineWidth = 2;
        const grad= ctx.createLinearGradient(x_pos, y_pos, x_pos, y_pos+height);
        grad.addColorStop(0, "green");
        grad.addColorStop(0.5, "#888");
        grad.addColorStop(1, "red");
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x_pos,y_pos+(height/2)-this.data[0]*(height/2-2));
        const stepsize = width/(FF_RESOLUTION+1);
        let i = 1;
        for (let xshift = stepsize; xshift < width; xshift+=stepsize){
            const ff_data = i > FF_RESOLUTION ? 0 : this.data[i];
            const yshift = ff_data*(height/2-2);
            ctx.lineTo(x_pos+xshift,y_pos+(height/2)-yshift);
            i++;
        }
        ctx.lineTo(x_pos+width,y_pos+height/2);
        ctx.stroke();
    }
};


class ParticleSim
{
    constructor(sim_size) 
    {
        SIM_WIDTH = sim_size;
        SIM_HEIGHT = sim_size;
        // Store all 2d positions, velocity, and type in array
        this.physdata = new Float64Array(PHYS_DATA_SIZE * SIM_PARTICLESMAX);
        this.forcefunc = new Array(SIM_PARTICLETYPES**2);
        for(let i = 0; i<SIM_PARTICLETYPES**2; i++)
            this.forcefunc[i] = new ForceFunction();
        this.init();
    }
    init(randomize_positions=true, slowmorph = 1)
    {
        if(randomize_positions)
        for(let i = 0; i<PHYS_DATA_SIZE * SIM_PARTICLESMAX; i+=PHYS_DATA_SIZE)
        {
            // randomize position, zero out velocity
            this.physdata[i+PHYS_X_POS] = Math.random() * SIM_WIDTH;
            this.physdata[i+PHYS_Y_POS] = Math.random() * SIM_HEIGHT;
            this.physdata[i+PHYS_X_VEL] = 0;
            this.physdata[i+PHYS_Y_VEL] = 0;
            this.physdata[i+PHYS_TYPE] = get_random_int(SIM_PARTICLETYPES);
        }

        for(let i = 0; i<SIM_PARTICLETYPES**2; i++)
            this.forcefunc[i].init(slowmorph);
    }
    apply_edge_force(ax, ay, bx, by, atype, btype, scale)
    {
        let fx = 0;
        let fy = 0;
        [-SIM_WIDTH, 0, SIM_WIDTH].forEach( (x_offset) => {
            [-SIM_HEIGHT, 0, SIM_HEIGHT].forEach( (y_offset) => {
                if((ax+x_offset-bx)**2 + (ay+y_offset-by)**2 < SIM_CHECK_SQDIST){
                    const f = this.apply_force(ax+x_offset, ay+y_offset, bx, by, atype, btype, scale);
                    fx += f.x;
                    fy += f.y;
                }    
            });
        });
        return {
            x: fx,
            y: fy,
        }
    }
    apply_force(ax, ay, bx, by, atype, btype, scale)
    {
        const dist = Math.sqrt((ax-bx)**2 + (ay-by)**2);
        // normalized force vector
        const fx = (ax-bx)/(dist+0.01); 
        const fy = (ay-by)/(dist+0.01);
        const ff = this.forcefunc[atype+SIM_PARTICLETYPES*btype];
        const forcemult = ff.get(dist) * scale * FF_GLOBAL_SCALE;
        // console.log(dist, fx, fy, forcemult)
        return {
            x: fx * forcemult,
            y: fy * forcemult,
        }
    }
    simulate(timestep)
    {
        // calculate total change in force for each particle
        for(let i = 0; i<SIM_PARTICLES; i++)
        {
            const physbuffer_index = i*2;
            const this_particle_index = i*5;
            // this.physbuffer[physbuffer_index] = 0;
            // this.physbuffer[physbuffer_index+1] = 0;
            const ax = this.physdata[this_particle_index+PHYS_X_POS];
            const ay = this.physdata[this_particle_index+PHYS_Y_POS];
            let sum_x = 0;
            let sum_y = 0;
            const atype = parseInt(this.physdata[this_particle_index+PHYS_TYPE]);

            for(let j = 0; j<SIM_PARTICLES; j++)
            {
                if (i == j) continue;
                const physdata_index = j*PHYS_DATA_SIZE;
                const bx = this.physdata[physdata_index+PHYS_X_POS];
                const by = this.physdata[physdata_index+PHYS_Y_POS];
                const btype = this.physdata[physdata_index+PHYS_TYPE];
                const fvector = this.apply_edge_force(bx, by, ax, ay, atype, btype, 1);
                // this.physbuffer[physbuffer_index] += fvector.x;
                // this.physbuffer[physbuffer_index+1] += fvector.y;
                sum_x += fvector.x
                sum_y += fvector.y
            }
            //apply new velocity
            this.physdata[this_particle_index+PHYS_X_VEL] += sum_x*timestep;
            this.physdata[this_particle_index+PHYS_Y_VEL] += sum_y*timestep;

            let vel_magnitude = Math.sqrt(this.physdata[this_particle_index+PHYS_X_VEL]**2
                                           +this.physdata[this_particle_index+PHYS_Y_VEL]**2)
            const vel_heading = Math.atan2(this.physdata[this_particle_index+PHYS_Y_VEL],
                                           this.physdata[this_particle_index+PHYS_X_VEL])
            // soft speed limit
            if (vel_magnitude > SIM_SPEEDLIMIT)
                vel_magnitude += (SIM_SPEEDLIMIT - vel_magnitude) / SIM_SPEEDDAMPEN;
            
            this.physdata[this_particle_index+PHYS_X_VEL] = Math.cos(vel_heading) * vel_magnitude;
            this.physdata[this_particle_index+PHYS_Y_VEL] = Math.sin(vel_heading) * vel_magnitude;
        }
        // update all positions
        for(let i = 0; i<PHYS_DATA_SIZE * SIM_PARTICLES; i+=PHYS_DATA_SIZE)
        {
            this.physdata[i+PHYS_X_POS] += this.physdata[i+PHYS_X_VEL]*timestep;
            this.physdata[i+PHYS_Y_POS] += this.physdata[i+PHYS_Y_VEL]*timestep;

            // wall wrap
            if(this.physdata[i+PHYS_X_POS]<0)
            {
                this.physdata[i+PHYS_X_POS] += SIM_WIDTH;
            }
            if(this.physdata[i+PHYS_X_POS]>SIM_WIDTH)
            {
                this.physdata[i+PHYS_X_POS] -= SIM_WIDTH;
            }
            if(this.physdata[i+PHYS_Y_POS]<0)
            {
                this.physdata[i+PHYS_Y_POS] += SIM_HEIGHT;
            }
            if(this.physdata[i+PHYS_Y_POS]>SIM_HEIGHT)
            {
                this.physdata[i+PHYS_Y_POS] -= SIM_HEIGHT;
            }
        }
    }
    draw_particles(ctx)
    {
        ctx.globalAlpha = DISP_PARTICLEALPHA
        for(let i = 0; i<PHYS_DATA_SIZE * SIM_PARTICLES; i+=PHYS_DATA_SIZE)
        {
            ctx.fillStyle = COLOR_TYPES[parseInt(this.physdata[i+PHYS_TYPE])];
            // ctx.fillRect (this.physdata[i+PHYS_X_POS]-RADIUS, this.physdata[i+PHYS_Y_POS]-RADIUS, 2*RADIUS, 2*RADIUS);
            ctx.beginPath();
            ctx.arc (this.physdata[i+PHYS_X_POS], this.physdata[i+PHYS_Y_POS], DISP_PARTICLERADIUS, 0, 2*Math.PI, false);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}