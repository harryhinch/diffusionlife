class Control
{
    constructor(var_name, properties, key) 
    {
        this.name = var_name;
        this.key = key;
        this.properties = properties;
        this.value = properties.value_default;
    }
    to_html()
    {
        if(this.properties.type == 'slider')
            return `<div class="slidecontainer"><p>${this.properties.display_name}:
                <span id="control${this.key}span">${this.get_display_value()}</span></p>
                <input autocomplete="off" type="range" class="slider" id="control${this.key}"
                min="${this.properties.value_min}" max="${this.properties.value_max}"
                step="${this.properties.value_step}" value="${this.value}" oninput="updateControl(${this.key})"></div>`;
        if(this.properties.type == 'button')
            return `<button type="button" id="control${this.key}" onclick="${this.properties.onclick}">
                ${this.properties.display_name}</button>`;
    }
    get_display_value(){
        if(this.properties.type == 'slider')
            return `${this.value}${this.properties.display_unit}`
    }
    update()
    {
        const inputid = 'control' + this.key;
        const new_value = document.getElementById(inputid).value;
        if(this.properties.type == 'slider')
        {
            this.value = Number(new_value);
        }
        window[this.name] = this.value;
        document.getElementById(inputid + 'span').innerText = this.get_display_value();
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
function getControlHTML(group){
    return controls.filter(x => x.properties.group == group).map(x => x.to_html());
}