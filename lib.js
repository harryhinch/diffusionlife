/* v.1.1.0 */
function lerp (a, b, t) { return (1 - t) * a + t * b; }
function get_random_int(max) { return Math.floor(Math.random() * max) }
function constrain(i, min=0, max=1) { return Math.min(max, Math.max(min, i)) }
// big thanks to: https://stackoverflow.com/a/6274381
Object.defineProperty(Array.prototype, 'shuffle', {
    value: function() {
        for (let i = this.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this[i], this[j]] = [this[j], this[i]];
        }
        return this;
    }
  });

// based on https://thecodingtrain.com/challenges/98-quadtree
class ToroidalZone
{
    // only wraps in the [0,1] space,
    // boundary coords can't be less than -1 or greater than 2
    constructor(cx, cy, rw, rh)
    {
        // best to think of this with a center (at cx,cy)
        // with a "radius" of rw, rh (not full width/height)
        this.x = cx;
        this.y = cy;
        this.w = rw;
        this.h = rh;
    }
    contains(x, y)
    {
        let regular_check = (
            x >= this.x - this.w &&
            x < this.x + this.w &&
            y >= this.y - this.h &&
            y < this.y + this.h);
        if (regular_check) return true;
        // isn't contained normally, now edge check
        let offset_x = 0, offset_y = 0;
        if (Math.abs(x-this.x) > 0.5) {offset_x = -Math.sign(x-this.x)} 
        if (Math.abs(y-this.y) > 0.5) {offset_y = -Math.sign(y-this.y)} 
        let zwest = this.x - this.w;
        let zeast = this.x + this.w;
        let znorth = this.y - this.h;
        let zsouth = this.y + this.h;
        return (
                x+offset_x >= zwest &&
                x+offset_x < zeast &&
                y+offset_y >= znorth &&
                y+offset_y < zsouth);
    }
    intersects(zone)
    {
        let regular_check = !(
            zone.x - zone.w >= this.x + this.w ||
            zone.x + zone.w <= this.x - this.w ||
            zone.y - zone.h >= this.y + this.h ||
            zone.y + zone.h <= this.y - this.h
        );
        if (regular_check) return true;
        // doesn't intersect normally, now edge check
        let offset_x = 0, offset_y = 0;
        if (Math.abs(zone.x-this.x) > 0.5) {offset_x = -Math.sign(zone.x-this.x)} 
        if (Math.abs(zone.y-this.y) > 0.5) {offset_y = -Math.sign(zone.y-this.y)} 
        let zwest = zone.x - zone.w;
        let zeast = zone.x + zone.w;
        let znorth = zone.y - zone.h;
        let zsouth = zone.y + zone.h;
        return !(
            zwest+offset_x >= this.x + this.w ||
            zeast+offset_x <= this.x - this.w ||
            znorth+offset_y >= this.y + this.h ||
            zsouth+offset_y <= this.y - this.h
        );
    }

}
class ToroidalQTree {
    constructor(boundary, n)
    {
        this.boundary = boundary;
        this.capacity = n;
        this.points = [];
        this.divided = false;
    }
    subdivide()
    {
        let x = this.boundary.x;
        let y = this.boundary.y;
        let w = this.boundary.w;
        let h = this.boundary.h;
        let ne = new ToroidalZone(x + w / 2, y - h / 2, w / 2, h / 2);
        this.northeast = new ToroidalQTree(ne, this.capacity);
        let nw = new ToroidalZone(x - w / 2, y - h / 2, w / 2, h / 2);
        this.northwest = new ToroidalQTree(nw, this.capacity);
        let se = new ToroidalZone(x + w / 2, y + h / 2, w / 2, h / 2);
        this.southeast = new ToroidalQTree(se, this.capacity);
        let sw = new ToroidalZone(x - w / 2, y + h / 2, w / 2, h / 2);
        this.southwest = new ToroidalQTree(sw, this.capacity);
        this.divided = true;
    }

    insert(x, y, data_index)
    {
        if (!this.boundary.contains(x, y))
        return false;

        if (this.points.length < this.capacity)
        {
            this.points.push([x, y, data_index]);
            return true;
        }

        if (!this.divided)
            this.subdivide();

        if (this.northeast.insert(x, y, data_index)) {
            return true;
        } else if (this.northwest.insert(x, y, data_index)) {
            return true;
        } else if (this.southeast.insert(x, y, data_index)) {
            return true;
        } else if (this.southwest.insert(x, y, data_index)) {
            return true;
        }
    }
  
    query(range, found=[])
    {
        if (!this.boundary.intersects(range))
            return;

        for (let p of this.points)
        {
            if (range.contains(p[0], p[1]))
                found.push(p);
        }
        if (this.divided)
        {
            this.northwest.query(range, found);
            this.northeast.query(range, found);
            this.southwest.query(range, found);
            this.southeast.query(range, found);
        }
        return found;
    }

    debug_draw(ctx)
    {
        if (this.divided)
        {
            this.northeast.debug_draw(ctx);
            this.northwest.debug_draw(ctx);
            this.southeast.debug_draw(ctx);
            this.southwest.debug_draw(ctx);
        } else
        {
            let SIM_WIDTH = ctx.canvas.clientWidth;
            let SIM_HEIGHT = ctx.canvas.clientHeight;
            const SQ_SIZE = Math.min(SIM_WIDTH, SIM_HEIGHT);
            const x_offset = Math.max(0,SIM_WIDTH-SQ_SIZE)/2;
            const y_offset = Math.max(0,SIM_HEIGHT-SQ_SIZE)/2;
            ctx.strokeStyle = "#0f0";
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.rect(
                (this.boundary.x-this.boundary.w)*SQ_SIZE + x_offset,
                (this.boundary.y-this.boundary.h)*SQ_SIZE + y_offset,
                (this.boundary.w*2)*SQ_SIZE,
                (this.boundary.h*2)*SQ_SIZE,
            );
            ctx.stroke();
        }
    }
}
  