const w : number = window.innerWidth
const h : number = window.innerHeight 
const parts : number = 3
const scGap : number = 0.02 / parts 
const sizeFactor : number = 9.2 
const steps : number = 4 
const strokeFactor : number = 90 
const colors : Array<string> = [
    "#673AB7",
    "#f44336",
    "#1A237E",
    "#4CAF50",
    "#BF360C"
]
const backColor : string = "#bdbdbd"
const delay : number = 20 

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }
 
    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n)) * n 
    }

    static sinify(scale : number) : number {
        return Math.sin(scale * Math.PI)
    }
}

class DrawingUtil {

    static drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) {
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }

    static drawSmallRectSteps(context : CanvasRenderingContext2D, scale : number) {
        const sc1 : number = ScaleUtil.divideScale(scale, 0, parts)
        const sc2 : number = ScaleUtil.divideScale(scale, 1, parts)
        const sc3 : number = ScaleUtil.divideScale(scale, 2, parts)
        const gap : number = Math.min(w, h) / sizeFactor 
        const size : number = gap * steps 
        context.save()
        context.translate(w / 2 + gap / 2, h / 2 + size  / 2)
        DrawingUtil.drawLine(context, 0, -size * sc3, 0, -size * sc1)
        for (var j = 0; j < steps; j++) {
            const sc2f : number = ScaleUtil.sinify(sc2)
            const sc2f1 : number = ScaleUtil.divideScale(sc2f, 0, 2)
            const sc2f2 : number = ScaleUtil.divideScale(sc2f, 1, 2)
            context.save()
            context.translate(0, -gap * j)
            DrawingUtil.drawLine(context, -gap * sc2f1, 0, 0, 0)
            context.fillRect(-gap, -gap * sc2f2, gap, gap * sc2f2)
            context.restore()
        }
        context.restore()
    }

    static drawSRSNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        context.fillStyle = colors[i]
        context.strokeStyle = colors[i]
        context.lineCap = 'round'
        context.lineWidth = Math.min(w, h) / strokeFactor 
        DrawingUtil.drawSmallRectSteps(context, scale)
    }
}

class Stage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D 
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w 
        this.canvas.height = h 
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor 
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : Stage = new Stage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class State {

    scale : number = 0 
    dir : number = 0 
    prevScale : number = 0 

    update(cb : Function) {
        this.scale += this.dir * scGap 
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir 
            this.dir = 0 
            this.prevScale = this.scale 
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale 
            cb()
        }
    }
}

class Animator {

    animated : boolean = false 
    interval : number 

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true 
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false 
            clearInterval(this.interval)
        }
    }
}

class SRSNode {

    prev : SRSNode 
    next : SRSNode 
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < colors.length - 1) {
            this.next = new SRSNode(this.i + 1)
            this.next.prev = this 
        }
    }

    draw(context : CanvasRenderingContext2D) {
        DrawingUtil.drawSRSNode(context, this.i, this.state.scale)
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }
    
    getNext(dir : number, cb : Function) {
        var curr : SRSNode = this.prev 
        if (dir == 1) {
            curr = this.next 
        }
        if (curr) {
            return curr 
        }
        cb()
        return this 
    }
}

class SmallRectStep {

    curr : SRSNode = new SRSNode(0)
    dir : number = 1 


    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }
}

class Renderer {

    srs : SmallRectStep = new SmallRectStep()
    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.srs.draw(context)
    }

    handleTap(cb : Function) {
        this.srs.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.srs.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}