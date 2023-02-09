// v1.0.0

var previous_time;
var framerate = 60;
var frametime = 1000 / framerate;

var sim;
var stop = false;
var canvas, ctx, ffctx;

addControl('PLAYBACKSCALE', {
    type: 'slider',
    group: 'playback',
    display_name: 'Physics Timescale',
    display_unit: '',
    value_min: 1,
    value_default: 300,
    value_max: 500,
    value_step: 1,
});

function drawFrame(current_time)
{   
    window.requestAnimationFrame(drawFrame);

    let time_diff = current_time - previous_time;
    
    if(!stop && time_diff > frametime)
    {
        previous_time = current_time - (time_diff % frametime);
        sim.simulate(time_diff*(PLAYBACKSCALE/10000));
        ctx.fillStyle = "#0e0e0e";
        ctx.fillRect(-2, -2, canvas.width+2, canvas.height+2);
        sim.draw_particles(ctx);
    }
}

function drawFFMatrix(ctx, width, height)
{
    ctx.clearRect(0, 0, width, height);
    const padding = 3;
    const rowheight = height/7;
    const colwidth = width/7;
    const header_radius = (Math.min(height,width)/7)/3;
    // draw headers
    for (let i = 0; i < SIM_PARTICLETYPES; i++)
    {
        ctx.fillStyle = COLOR_TYPES[i];
        ctx.beginPath();
        // draw dest
        ctx.arc (colwidth/2 + (i+1) * colwidth + padding/2, rowheight/2 + padding/2, header_radius, 0, 2*Math.PI, false);
        // draw source
        ctx.arc (colwidth/2 + padding/2, rowheight/2 + (i+1) * rowheight + padding/2, header_radius, 0, 2*Math.PI, false);
        ctx.fill();
    }

    // draw FF grid
    for (let i = 0; i < SIM_PARTICLETYPES; i++)
    {
        for (let j = 0; j < SIM_PARTICLETYPES; j++) 
        {
            const ff = sim.forcefunc[j+i*SIM_PARTICLETYPES];
            const x_pos = (i+1) * colwidth + padding;
            const y_pos = (j+1) * rowheight + padding;
            ff.draw(ctx, x_pos, y_pos, colwidth - padding, rowheight - padding);
        }
    }
}

function updateFParam(){
    drawFFMatrix(ffctx, 200, 200)
}

addControl('randomize_ff', {
    type: 'button',
    group: 'ffbuttons',
    display_name: 'Randomize All Function Parameters',
    onclick: 'sim.init(false);updateFParam();',
});

window.onload = () => {
    const canvaspadding = document.documentElement.clientWidth < 720 ? 50 : 40
    var canvas_h = Math.min(document.documentElement.clientHeight, document.documentElement.clientWidth)-canvaspadding;
    document.getElementById('simcanvas').innerHTML = `<canvas id="canvas" width="${canvas_h}" height="${canvas_h}"></canvas>`;

    sim = new ParticleSim(canvas_h);

    document.getElementById('ffsettings').innerHTML = `<canvas id="ffcanvas" width="${200}" height="${200}"></canvas>`;
    document.getElementById('ffsettings').innerHTML += `<div class="button-container">
        ${getControlHTML('ffbuttons').join('\n')}</div>`;
    document.getElementById('simsettings').innerHTML = getControlHTML('sim').join('\n');
    document.getElementById('playback').innerHTML = getControlHTML('playback').join('\n');
    document.getElementById('dispsettings').innerHTML = getControlHTML('display').join('\n');

    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    ffctx = document.getElementById('ffcanvas').getContext('2d');
    updateFParam();

    previous_time = window.performance.now();
    window.requestAnimationFrame(drawFrame);
};