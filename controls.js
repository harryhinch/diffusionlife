/* v.1.1.2 */
class Control
{
    constructor(var_name, properties, key) 
    {
        this.name = var_name;
        this.key = key;
        this.properties = properties;
        if(this.properties.type == 'choice'){
            this.value = properties.choices.indexOf(properties.value_default);
            this.properties.value_max = properties.choices.length-1;
            window[this.name] = this.properties.choices[this.value];
        }
        else
            this.value = properties.value_default;
    }
    to_html()
    {
        if(this.properties.type == 'slider' || this.properties.type == 'choice')
            return `<div class="slidecontainer"><p>${this.properties.display_name}:
                <span id="control${this.key}span">${this.get_display_value()}</span></p>
                <input autocomplete="off" type="range" class="slider" id="control${this.key}"
                min="${this.properties.value_min ?? 0}" max="${this.properties.value_max}"
                step="${this.properties.value_step ?? 1}" value="${this.value}" oninput="updateControl(${this.key})"></div>`;
        if(this.properties.type == 'button')
            return `<button type="button" id="control${this.key}" onclick="${this.properties.onclick}">
                ${this.properties.display_name}</button>`;
        if(this.properties.type == 'toggle'){
            const tclass = this.properties.value ? "toggled" : "";
            const dispname = this.properties.value ? this.properties.display_name_toggled : this.properties.display_name;
            return `<button type="button" id="control${this.key}" class="${tclass}"
                onclick="updateControl(${this.key})">${dispname}</button>`;
        }
    }
    get_display_value(){
        if(this.properties.type == 'slider')
            return `${this.value}${this.properties.display_unit}`
        if(this.properties.type == 'choice')
            return this.properties.choices[this.value];
    }
    update()
    {
        const inputid = 'control' + this.key;
        if(this.properties.type == 'slider')
        {
            const new_value = document.getElementById(inputid).value;
            this.value = Number(new_value);
            window[this.name] = this.value;
            document.getElementById(inputid + 'span').innerText = this.get_display_value();
        } 
        else if(this.properties.type == 'choice')
        {
            const new_value = document.getElementById(inputid).value;
            this.value = Number(new_value);
            window[this.name] = this.properties.choices[this.value];
            document.getElementById(inputid + 'span').innerText = this.get_display_value();
        }
        else if(this.properties.type == 'toggle')
        {
            this.properties.value = !this.properties.value;
            document.getElementById(inputid).classList.toggle('toggled');
            const dispname = this.properties.value ? this.properties.display_name_toggled : this.properties.display_name;
            document.getElementById(inputid).innerText = dispname;
            this.properties.doToggle(this.properties.value);
        }
    }
    disable()
    {
        const inputid = 'control' + this.key;
        document.getElementById(inputid).setAttribute('disabled', true);
    }
    enable()
    {
        const inputid = 'control' + this.key;
        document.getElementById(inputid).removeAttribute('disabled');
    }
    set_value(new_val)
    {
        const inputid = 'control' + this.key;
        document.getElementById(inputid).value = new_val;
        this.update();
    }
}

var controls = [];
function addControl(var_name, properties){
    const key = controls.length;
    controls.push(new Control(var_name, properties, key));
    if(properties.type == 'slider')
    window[var_name] = properties.value_default;
}
function updateControl(key){
    controls[key].update();
}

function getControlFromName(display_name){
    for (let i = 0; i < controls.length; i++) {
        if (controls[i].properties?.display_name == display_name)
            return controls[i];
    }
}
function getControlHTML(group){
    return controls.filter(x => x.properties.group == group).map(x => x.to_html());
}


addControl('SIM_PARTICLES', {
    type: 'slider',
    group: 'sim',
    display_name: 'Particle Count',
    display_unit: '',
    value_min: 10,
    value_default: 500,
    value_max: 2000,
    value_step: 1,
});
addControl('SIM_PARTICLETYPES', {
    type: 'slider',
    group: 'sim',
    display_name: 'Particle Types',
    display_unit: '',
    value_min: 1,
    value_default: 4,
    value_max: 6,
    value_step: 1,
});
addControl('FF_DIST_SCALE', {
    type: 'slider',
    group: 'sim',
    display_name: 'Distance Scaling',
    display_unit: 'units',
    value_min: 0.001,
    value_default: 0.03,
    value_max: 0.1,
    value_step: 0.0005,
});
addControl('FF_GLOBAL_SCALE', {
    type: 'slider',
    group: 'sim',
    display_name: 'Force Multiplier',
    display_unit: 'x',
    value_min: 0,
    value_default: 0.5,
    value_max: 2,
    value_step: 0.005,
});
addControl('FF_ZERODIST_REPULSION', {
    type: 'slider',
    group: 'sim',
    display_name: 'Repulsion Factor',
    display_unit: 'x',
    value_min: 0,
    value_default: 10,
    value_max: 100,
    value_step: 0.01,
});
addControl('SIM_SPEEDLIMIT', {
    type: 'slider',
    group: 'sim',
    display_name: 'Speed Limit',
    display_unit: 'x',
    value_min: 0,
    value_default: 0.004,
    value_max: 0.2,
    value_step: 0.001,
});
addControl('SIM_SPEEDDAMPEN', {
    type: 'slider',
    group: 'sim',
    display_name: 'Speed Limit Relaxation',
    display_unit: '',
    value_min: 1,
    value_default: 6,
    value_max: 15,
    value_step: 0.05,
});

addControl('fullscreen_enable_button', {
    type: 'button',
    group: 'display',
    display_name: 'Open Sim Fullscreen',
    onclick: 'toggleFullscreen();',
});

addControl('DISP_PARTICLESHAPE', {
    type: 'choice',
    group: 'display',
    display_name: 'Particle Shape',
    value_default: 'Vector',
    choices: ['Square', 'Circle', 'Triangle', 'Vector'],
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
addControl('DISP_BACKGROUNDALPHA', {
    type: 'slider',
    group: 'display',
    display_name: 'Background Alpha',
    display_unit: '',
    value_min: 0,
    value_default: 0.5,
    value_max: 1,
    value_step: 0.01,
});
addControl('DEBUG_SHOW_QUADTREE', {
    type: 'slider',
    group: 'display',
    display_name: 'Show QuadTree',
    display_unit: '',
    value_min: 0,
    value_default: 0,
    value_max: 1,
    value_step: 1,
});

addControl('PLAYBACKSCALE', {
    type: 'slider',
    group: 'playback',
    display_name: 'Physics Timescale',
    display_unit: '',
    value_min: 1,
    value_default: 35,
    value_max: 100,
    value_step: 1,
});

addControl('adaptive_timescale', {
    type: 'toggle',
    group: 'playback',
    value: false,
    display_name: 'Adaptive Timescale OFF',
    display_name_toggled: 'Adaptive Timescale ON',
    doToggle: (new_val) => {
        SIM_ADAPTIVE_TIMESCALE = new_val;
    },
});

addControl('toggle_autoplay', {
    type: 'toggle',
    group: 'playback',
    value: false,
    display_name: 'Auto Randomize OFF',
    display_name_toggled: 'Auto Randomize ON',
    doToggle: (new_val) => {
        SIM_AUTOPLAY = new_val;
        AUTOPLAY_TIMER = Date.now();
    },
});

addControl('toggle_autoplay_ptypes', {
    type: 'toggle',
    group: 'playback',
    value: false,
    display_name: 'Randomize Particle Types OFF',
    display_name_toggled: 'Randomize Particle Types ON',
    doToggle: (new_val) => {
        SIM_AUTOPLAY_PTYPES = new_val;
        if(new_val)
            getControlFromName('Particle Types').disable();
        else
            getControlFromName('Particle Types').enable();
    },
});

addControl('toggle_color_shuffle', {
    type: 'toggle',
    group: 'playback',
    value: true,
    display_name: 'Color Shuffle OFF',
    display_name_toggled: 'Color Shuffle ON',
    doToggle: (new_val) => {
        COLOR_TYPE_SHUFFLE = new_val;
    },
});

addControl('AUTOPLAY_TIMELIMIT', {
    type: 'slider',
    group: 'playback',
    display_name: 'Auto Randomize Timer',
    display_unit: ' sec',
    value_min: 3,
    value_default: 30,
    value_max: 180,
    value_step: 1,
});

addControl('randomize_ff', {
    type: 'button',
    group: 'ffbuttons',
    display_name: 'Randomize',
    onclick: 'sim.init(false, \'randomize\');updateFParam();',
});
addControl('identity_ff', {
    type: 'button',
    group: 'ffbuttons',
    display_name: 'Reset',
    onclick: 'sim.init(false, \'identity\');updateFParam();',
});