/* v.1.2.0 */

var previous_time;
var framerate = 60;
var framect = 0;
var frametime = 1000 / framerate;

var sim;
var stop = false;
var canvas, ctx, ffctx;

function drawFrame(current_time)
{   
    window.requestAnimationFrame(drawFrame);
    framect++;

    let time_diff = current_time - previous_time;
    
    if(!stop && time_diff > frametime)
    {
        previous_time = current_time - (time_diff % frametime);
        let timestep = (PLAYBACKSCALE/10000);
        if(SIM_ADAPTIVE_TIMESCALE)
            timestep *= time_diff;
        else
            timestep *= frametime;
        sim.simulate(timestep);
        ctx.fillStyle = `rgb(14, 14, 14, ${DISP_BACKGROUNDALPHA})`;
        ctx.fillRect(-2, -2, canvas.width+2, canvas.height+2);
        sim.draw_particles(ctx);
    }
}

function drawFFMatrix(ctx, width, height)
{
    ctx.clearRect(0, 0, width, height);
    const padding = 3;
    const rowheight = height/(SIM_PARTICLETYPES+1);
    const colwidth = width/(SIM_PARTICLETYPES+1);
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
            const ff = sim.forcefunc[i+SIM_PARTICLETYPE_MAX*j];
            const x_pos = (i+1) * colwidth + padding;
            const y_pos = (j+1) * rowheight + padding;
            ff.draw(ctx, x_pos, y_pos, colwidth - padding, rowheight - padding);
        }
    }
}

function redrawFFGrid()
{
    const ffgrid = document.getElementById('ffgrid');
    const grid_height = ffgrid.getBoundingClientRect().height;
    const grid_size = SIM_PARTICLETYPES + 1;
    const cell_size = grid_height / grid_size;
    const padding = 2;

    let grid_data = [];
    for (let i = 0; i < grid_size; i++)
    {
        for (let j = 0; j < grid_size; j++) 
        {
            // not a header row/column
            if (i > 0 && j > 0)
            {
                grid_data[j+i*grid_size] = `<div class="ffgrid-cell" onclick="openFFeditor(${j-1},${i-1})">
                    <canvas id="ff-cell-${i-1}-${j-1}" width="${cell_size}" height="${cell_size}"></canvas></div>`;

            } else {
                if (i == 0 && j == 0)
                    grid_data[j+i*grid_size] = `<div class="ffgrid-cell-header"></div>`;
                else
                    grid_data[j+i*grid_size] = `<div class="ffgrid-cell-header" style="background-color:${COLOR_TYPES[Math.max(i,j)-1]}"></div>`;
            }
        }
    }
    ffgrid.classList = `size-${SIM_PARTICLETYPES}`;
    ffgrid.innerHTML = grid_data.join('');
    // now that DOM is updated, draw on each canvas:
    for (let i = 0; i < SIM_PARTICLETYPES; i++)
    {
        for (let j = 0; j < SIM_PARTICLETYPES; j++) 
        {
            const ctx = document.getElementById(`ff-cell-${i}-${j}`).getContext('2d');
            const ff = sim.forcefunc[i+SIM_PARTICLETYPE_MAX*j];
            ff.draw(ctx, padding, padding, cell_size-padding-2, cell_size-padding-2);
        }
    }
}


function updateFParam()
{
    redrawFFGrid();
}

function toggleFullscreen() {
    let elem = document.getElementById("simcanvas");
  
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        console.log(
          `Error attempting to enable fullscreen mode: ${err.message} (${err.name})`
        );
      });
      
    } else {
      document.exitFullscreen();
    }
  }
  
function resizeCanvas() {
    if(document.fullscreenElement){
        const parent_div = document.getElementById('simcanvas');
        parent_div.classList.add('fullscreen');
        ctx.canvas.width = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
    } else {
        const parent_div = document.getElementById('simcanvas');
        parent_div.classList.remove('fullscreen');
        ctx.canvas.width = parent_div.offsetWidth;
        ctx.canvas.height = parent_div.offsetHeight;
    }
}

window.onload = () => {
    document.getElementById('simcanvas').innerHTML = `<canvas id="canvas" width="1" height="1"></canvas>`;
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();

    document.getElementById('simcanvas').addEventListener('fullscreenchange', resizeCanvas);

    sim = new ParticleSim();

    // document.getElementById('ffsettings').innerHTML = `<canvas id="ffcanvas" width="${200}" height="${200}"></canvas>`;
    document.getElementById('ffsettings').innerHTML = `<div id="ffgrid"></div>`;
    document.getElementById('ffsettings').innerHTML += `<div class="button-container">
        ${getControlHTML('ffbuttons').join('\n')}</div>`;
    document.getElementById('simsettings').innerHTML = getControlHTML('sim').join('\n');
    document.getElementById('playback').innerHTML = getControlHTML('playback').join('\n');
    document.getElementById('dispsettings').innerHTML = getControlHTML('display').join('\n');

    // ffctx = document.getElementById('ffcanvas').getContext('2d');
    
    previous_time = window.performance.now();
    window.requestAnimationFrame(drawFrame);
    
    initFFcontrols();
    setTimeout(()=>{updateFParam()},1);

    var framecounter = document.getElementById('fps-counter');
    setInterval(()=>{
        framecounter.innerText = `${(framect).toFixed(0)}FPS`;
        framect = 0;
    }, 1000)
};