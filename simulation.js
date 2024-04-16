/* v.2.0.1 */

var FF_RESOLUTION = 4;
var QTREE_CAPACITY = 8;
var SIM_ADAPTIVE_TIMESCALE = false;
var SIM_AUTOPLAY = false;
var AUTOPLAY_TIMER = 0;
var SIM_AUTOPLAY_PTYPES = false;
var SIM_PARTICLESMAX = 4000;
var SIM_PARTICLETYPE_MAX = 6;
var SIM_PARTICLETYPES_LAST = -1;
var COLOR_TYPE_SHUFFLE = true;

var COLOR_TYPES = [
    '#FF2200',
    '#00FF00',
    '#7766FF',
    '#FF22DD',
    '#11FFDD',
    '#FFFF00',
]

// index into data array for particles
const PHYS_DATA_SIZE = 7;
const PHYS_X_POS = 0;
const PHYS_Y_POS = 1;
const PHYS_X_VEL = 2;
const PHYS_Y_VEL = 3;
const PHYS_HEADING = 4;
const PHYS_MAGNITUDE= 5;
const PHYS_TYPE = 6;

class ForceFunction
{
    constructor() 
    {
        this.data = new Float64Array(FF_RESOLUTION + 2);
        this.init(1);
    }
    init(mode="randomize", slowmorph=1)
    {
        this.data[0] = -1;
        this.data[FF_RESOLUTION-1] = 0;
        for(let i = 1; i<=FF_RESOLUTION; i++)
        {
            let target_val = 0;
            if (mode == "randomize")
                target_val = Math.random()*2-1;
            this.data[i] = lerp(this.data[i], target_val, slowmorph);
        }
    }
    get(distance)
    {
        // clamp to array boundaries
        const dist = Math.min(FF_RESOLUTION + 1,
                     Math.max(0, distance / FF_DIST_SCALE));
        if(dist >= (FF_RESOLUTION+1)) return 0;
        const index = Math.floor(dist);
        const fractional = dist - index;
        let lerp_start = this.data[index];
        if (index == 0)
            lerp_start *= FF_ZERODIST_REPULSION;
        return lerp(lerp_start, this.data[index+1], fractional);
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
    constructor() 
    {
        // Store all 2d positions, velocity, and type in array
        this.physdata = new Float64Array(PHYS_DATA_SIZE * SIM_PARTICLESMAX);
        this.forcefunc = new Array(SIM_PARTICLETYPE_MAX**2);
        for(let i = 0; i<SIM_PARTICLETYPE_MAX**2; i++)
            this.forcefunc[i] = new ForceFunction();
        this.init();
        this.quadtree = null;
        this.quadtree_frameskip = 0;
        this.checkdistance = FF_DIST_SCALE * FF_RESOLUTION;
    }
    calculate_qtree()
    {
        this.quadtree = new ToroidalQTree(new ToroidalZone(0.5,0.5,0.5,0.5), QTREE_CAPACITY);
        this.checkdistance = FF_DIST_SCALE * FF_RESOLUTION;
        for(let i = 0; i < PHYS_DATA_SIZE * SIM_PARTICLES; i+=PHYS_DATA_SIZE)
        {
            this.quadtree.insert(
                this.physdata[i+PHYS_X_POS] % 1,
                this.physdata[i+PHYS_Y_POS] % 1,
                this.physdata[i+PHYS_TYPE]);
        }
    }
    init(randomize_positions=true, ff_mode="randomize", slowmorph = 1)
    {
        if(SIM_AUTOPLAY_PTYPES)
            this.#randomize_ptypes();
        
        for(let i = 0; i<PHYS_DATA_SIZE * SIM_PARTICLESMAX; i+=PHYS_DATA_SIZE)
        {
            // randomize position, zero out velocity
            if(randomize_positions)
            {
                this.physdata[i+PHYS_X_POS] = Math.random();
                this.physdata[i+PHYS_Y_POS] = Math.random();
                this.physdata[i+PHYS_X_VEL] = 0;
                this.physdata[i+PHYS_Y_VEL] = 0;
            }
            if(SIM_PARTICLETYPES_LAST != SIM_PARTICLETYPES)
                this.physdata[i+PHYS_TYPE] = get_random_int(SIM_PARTICLETYPES);
        }
        SIM_PARTICLETYPES_LAST = SIM_PARTICLETYPES;
        if(COLOR_TYPE_SHUFFLE)
            COLOR_TYPES.shuffle();
        for(let i = 0; i<SIM_PARTICLETYPE_MAX**2; i++)
            this.forcefunc[i].init(ff_mode, slowmorph);
    }
    apply_edge_force(ax, ay, bx, by, atype, btype, scale)
    {
        let fx = 0, fy = 0;
        let offset_x = 0, offset_y = 0;
        let dx = Math.abs(ax-bx);
        let dy = Math.abs(ay-by);
        if (dx > 0.5) {dx = 1.0 - dx; offset_x = -Math.sign(ax-bx)} 
        if (dy > 0.5) {dx = 1.0 - dy; offset_y = -Math.sign(ay-by)} 
        if((dx)**2 + (dy)**2 < 1){
            const f = this.apply_force(ax+offset_x, ay+offset_y, bx, by, atype, btype, scale);
            fx += f.x;
            fy += f.y;
        }  
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
        const ff = this.forcefunc[atype+SIM_PARTICLETYPE_MAX*btype];
        if(ff == undefined)console.log(atype, btype)
        const forcemult = ff.get(dist) * scale * FF_GLOBAL_SCALE;
        // console.log(dist, fx, fy, forcemult)
        return {
            x: fx * forcemult,
            y: fy * forcemult,
        }
    }
    simulate(timestep)
    {

        this.calculate_qtree();
        // calculate total change in force for each particle
        for(let i = 0; i<SIM_PARTICLES; i++)
        {
            const this_particle_index = i*PHYS_DATA_SIZE;
            const ax = this.physdata[this_particle_index+PHYS_X_POS];
            const ay = this.physdata[this_particle_index+PHYS_Y_POS];
            let sum_x = 0;
            let sum_y = 0;
            const atype = parseInt(this.physdata[this_particle_index+PHYS_TYPE]);

            let searchzone = new ToroidalZone(ax, ay, this.checkdistance, this.checkdistance);
            let candidates = this.quadtree.query(searchzone)
            if(candidates == undefined) candidates = [];
            candidates.forEach(candidate => {
                const bx = candidate[0];
                const by = candidate[1];
                const btype = candidate[2];
                if(ax != bx && ay != by){
                    const fvector = this.apply_edge_force(bx, by, ax, ay, atype, btype, 0.05);
                    sum_x += fvector.x
                    sum_y += fvector.y
                }
            });
            //apply new velocity
            this.physdata[this_particle_index+PHYS_X_VEL] += sum_x*timestep;
            this.physdata[this_particle_index+PHYS_Y_VEL] += sum_y*timestep;

            let vel_magnitude = Math.sqrt(this.physdata[this_particle_index+PHYS_X_VEL]**2
                                           +this.physdata[this_particle_index+PHYS_Y_VEL]**2)
            const vel_heading = Math.atan2(this.physdata[this_particle_index+PHYS_Y_VEL],
                                           this.physdata[this_particle_index+PHYS_X_VEL])

            this.physdata[this_particle_index+PHYS_HEADING] = vel_heading;

            // soft speed limit
            if (vel_magnitude > SIM_SPEEDLIMIT)
                vel_magnitude += (SIM_SPEEDLIMIT - vel_magnitude) / SIM_SPEEDDAMPEN;

            this.physdata[this_particle_index+PHYS_MAGNITUDE] = PHYS_MAGNITUDE;
            
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
                this.physdata[i+PHYS_X_POS] += 1;
            }
            if(this.physdata[i+PHYS_X_POS]>1)
            {
                this.physdata[i+PHYS_X_POS] -= 1;
            }
            if(this.physdata[i+PHYS_Y_POS]<0)
            {
                this.physdata[i+PHYS_Y_POS] += 1;
            }
            if(this.physdata[i+PHYS_Y_POS]>1)
            {
                this.physdata[i+PHYS_Y_POS] -= 1;
            }
        }
        if(SIM_AUTOPLAY)
        {
            const time_diff = (Date.now() - AUTOPLAY_TIMER)/1000;
            if(time_diff >= AUTOPLAY_TIMELIMIT)
            {
                AUTOPLAY_TIMER = Date.now();
                this.init(false, "randomize");
                updateFParam();
            }
        }
    }
    #randomize_ptypes()
    {
        // changing the random distribution
        // values like 3, 4 are more likley than 1, 6
        const twodice = 2 + get_random_int(6) + get_random_int(6);
        const new_val = Math.floor(twodice/2);
        getControlFromName('Particle Types').set_value(new_val);
    }
    draw_particles(ctx)
    {
        let SIM_WIDTH = ctx.canvas.clientWidth;
        let SIM_HEIGHT = ctx.canvas.clientHeight;
        const SQ_SIZE = Math.min(SIM_WIDTH, SIM_HEIGHT);
        const x_offset = Math.max(0,SIM_WIDTH-SQ_SIZE)/2;
        const y_offset = Math.max(0,SIM_HEIGHT-SQ_SIZE)/2;
        ctx.globalAlpha = DISP_PARTICLEALPHA
        for(let i = 0; i<PHYS_DATA_SIZE * SIM_PARTICLES; i+=PHYS_DATA_SIZE)
        {
            this.#draw_particle(ctx, i, x_offset, y_offset, SQ_SIZE);
            if(x_offset>0){
                let x_shift = this.physdata[i+PHYS_X_POS] > 0.5 ? -1 : 1;
                this.#draw_particle(ctx, i, x_offset+(x_shift*SQ_SIZE), y_offset, SQ_SIZE);
            }else if(y_offset>0){
                let y_shift = this.physdata[i+PHYS_Y_POS] > 0.5 ? -1 : 1;
                this.#draw_particle(ctx, i, x_offset, y_offset+(y_shift*SQ_SIZE), SQ_SIZE);
            }
        }
        ctx.globalAlpha = 1;
        if(DEBUG_SHOW_QUADTREE)
            this.quadtree.debug_draw(ctx);
    }
    #draw_particle(ctx, i, x_offset, y_offset, SQ_SIZE)
    {
        if(DISP_PARTICLESHAPE == 'Square')
        {
            ctx.fillStyle = COLOR_TYPES[parseInt(this.physdata[i+PHYS_TYPE])];
        
            ctx.fillRect(
                this.physdata[i+PHYS_X_POS]*SQ_SIZE+x_offset-DISP_PARTICLERADIUS,
                this.physdata[i+PHYS_Y_POS]*SQ_SIZE+y_offset-DISP_PARTICLERADIUS,
                DISP_PARTICLERADIUS*2, DISP_PARTICLERADIUS*2);
        }
        else if(DISP_PARTICLESHAPE == 'Circle')
        {
            ctx.beginPath();
            ctx.fillStyle = COLOR_TYPES[parseInt(this.physdata[i+PHYS_TYPE])];
            ctx.arc (
                this.physdata[i+PHYS_X_POS]*SQ_SIZE+x_offset,
                this.physdata[i+PHYS_Y_POS]*SQ_SIZE+y_offset,
                DISP_PARTICLERADIUS, 0, 2*Math.PI, false);
            ctx.fill();
        }
        else if(DISP_PARTICLESHAPE == 'Triangle')
        {
            const angle = this.physdata[i+PHYS_HEADING];
            const mag = DISP_PARTICLERADIUS*3;
            ctx.fillStyle = COLOR_TYPES[parseInt(this.physdata[i+PHYS_TYPE])];
            ctx.beginPath();
            ctx.moveTo(
                this.physdata[i+PHYS_X_POS]*SQ_SIZE+x_offset + mag * Math.cos(angle),
                this.physdata[i+PHYS_Y_POS]*SQ_SIZE+y_offset + mag * Math.sin(angle),
            );
            ctx.lineTo(
                this.physdata[i+PHYS_X_POS]*SQ_SIZE+x_offset + mag/2 * Math.cos(angle+2),
                this.physdata[i+PHYS_Y_POS]*SQ_SIZE+y_offset + mag/2 * Math.sin(angle+2),
            );
            ctx.lineTo(
                this.physdata[i+PHYS_X_POS]*SQ_SIZE+x_offset + mag/2 * Math.cos(angle-2),
                this.physdata[i+PHYS_Y_POS]*SQ_SIZE+y_offset + mag/2 * Math.sin(angle-2),
            );
            ctx.lineTo(
                this.physdata[i+PHYS_X_POS]*SQ_SIZE+x_offset + mag * Math.cos(angle),
                this.physdata[i+PHYS_Y_POS]*SQ_SIZE+y_offset + mag * Math.sin(angle),
            );
            ctx.fill();
        }
        else if(DISP_PARTICLESHAPE == 'Vector')
        {
            ctx.beginPath();
            ctx.strokeStyle = COLOR_TYPES[parseInt(this.physdata[i+PHYS_TYPE])];
            ctx.lineWidth = DISP_PARTICLERADIUS/2+0.5;
            const mag = 200 - this.physdata[i+PHYS_MAGNITUDE]*10 + DISP_PARTICLERADIUS*35;
            ctx.moveTo(
                this.physdata[i+PHYS_X_POS]*SQ_SIZE+x_offset,
                this.physdata[i+PHYS_Y_POS]*SQ_SIZE+y_offset,
            );
            ctx.lineTo(
                this.physdata[i+PHYS_X_POS]*SQ_SIZE+x_offset + this.physdata[i+PHYS_X_VEL] * mag,
                this.physdata[i+PHYS_Y_POS]*SQ_SIZE+y_offset + this.physdata[i+PHYS_Y_VEL] * mag,
            );
            ctx.stroke();
        }
    }
}