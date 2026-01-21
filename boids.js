// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size to match display size
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Boid class with depth
class Boid {
    constructor(x, y) {
        this.position = { x, y };
        this.velocity = {
            x: (Math.random() - 0.5) * 4,
            y: (Math.random() - 0.5) * 4
        };
        this.acceleration = { x: 0, y: 0 };
        this.maxSpeed = 4;
        this.maxForce = 0.1;
        this.perceptionRadius = 100;
        // Add depth for 3D effect
        this.depth = Math.random() * 0.6 + 0.4; // 0.4 to 1.0
    }

    edges() {
        // Wrap around edges
        if (this.position.x > canvas.width) this.position.x = 0;
        if (this.position.x < 0) this.position.x = canvas.width;
        if (this.position.y > canvas.height) this.position.y = 0;
        if (this.position.y < 0) this.position.y = canvas.height;
    }

    align(boids) {
        let steering = { x: 0, y: 0 };
        let total = 0;

        for (let other of boids) {
            let d = this.distance(this.position, other.position);
            if (other !== this && d < this.perceptionRadius) {
                steering.x += other.velocity.x;
                steering.y += other.velocity.y;
                total++;
            }
        }

        if (total > 0) {
            steering.x /= total;
            steering.y /= total;
            steering = this.setMag(steering, this.maxSpeed);
            steering.x -= this.velocity.x;
            steering.y -= this.velocity.y;
            steering = this.limit(steering, this.maxForce);
        }

        return steering;
    }

    cohesion(boids) {
        let steering = { x: 0, y: 0 };
        let total = 0;

        for (let other of boids) {
            let d = this.distance(this.position, other.position);
            if (other !== this && d < this.perceptionRadius) {
                steering.x += other.position.x;
                steering.y += other.position.y;
                total++;
            }
        }

        if (total > 0) {
            steering.x /= total;
            steering.y /= total;
            steering.x -= this.position.x;
            steering.y -= this.position.y;
            steering = this.setMag(steering, this.maxSpeed);
            steering.x -= this.velocity.x;
            steering.y -= this.velocity.y;
            steering = this.limit(steering, this.maxForce);
        }

        return steering;
    }

    separation(boids) {
        let steering = { x: 0, y: 0 };
        let total = 0;

        for (let other of boids) {
            let d = this.distance(this.position, other.position);
            if (other !== this && d < this.perceptionRadius / 2) {
                let diff = {
                    x: this.position.x - other.position.x,
                    y: this.position.y - other.position.y
                };
                if (d > 0) {
                    diff.x /= d;
                    diff.y /= d;
                }
                steering.x += diff.x;
                steering.y += diff.y;
                total++;
            }
        }

        if (total > 0) {
            steering.x /= total;
            steering.y /= total;
            steering = this.setMag(steering, this.maxSpeed);
            steering.x -= this.velocity.x;
            steering.y -= this.velocity.y;
            steering = this.limit(steering, this.maxForce);
        }

        return steering;
    }

    attract(point) {
        if (!point) return { x: 0, y: 0 };

        let steering = {
            x: point.x - this.position.x,
            y: point.y - this.position.y
        };

        steering = this.setMag(steering, this.maxSpeed);
        steering.x -= this.velocity.x;
        steering.y -= this.velocity.y;
        steering = this.limit(steering, this.maxForce * 2); // Stronger force

        return steering;
    }

    flock(boids, params, attractionPoint) {
        let alignment = this.align(boids);
        let cohesion = this.cohesion(boids);
        let separation = this.separation(boids);
        let attraction = this.attract(attractionPoint);

        // Apply weights
        alignment.x *= params.alignment;
        alignment.y *= params.alignment;
        cohesion.x *= params.cohesion;
        cohesion.y *= params.cohesion;
        separation.x *= params.separation;
        separation.y *= params.separation;
        attraction.x *= 3; // Strong attraction
        attraction.y *= 3;

        this.acceleration.x = alignment.x + cohesion.x + separation.x + attraction.x;
        this.acceleration.y = alignment.y + cohesion.y + separation.y + attraction.y;
    }

    update() {
        this.velocity.x += this.acceleration.x;
        this.velocity.y += this.acceleration.y;
        this.velocity = this.limit(this.velocity, this.maxSpeed);

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        this.acceleration.x = 0;
        this.acceleration.y = 0;
    }

    show() {
        // Draw boid as a triangle pointing in direction of movement
        const angle = Math.atan2(this.velocity.y, this.velocity.x);
        const size = 8 * this.depth; // Scale by depth

        // More depth = brighter and more opaque
        const brightness = Math.floor(180 + (this.depth * 75)); // 180-255 (brighter minimum)
        const opacity = 0.5 + (this.depth * 0.5); // 0.5-1.0 (more visible)

        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(angle);

        // Draw triangle
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size / 2, size / 2);
        ctx.lineTo(-size / 2, -size / 2);
        ctx.closePath();

        // Color varies from gray (far) to white (near)
        ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${opacity})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${opacity * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    // Helper methods
    distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    setMag(vec, mag) {
        const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
        if (len > 0) {
            return {
                x: (vec.x / len) * mag,
                y: (vec.y / len) * mag
            };
        }
        return vec;
    }

    limit(vec, max) {
        const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
        if (len > max) {
            return {
                x: (vec.x / len) * max,
                y: (vec.y / len) * max
            };
        }
        return vec;
    }
}

// Simulation
let boids = [];
let params = {
    separation: 1.5,
    alignment: 1.0,
    cohesion: 1.0
};

// Initialize with one boid
function init() {
    boids = [];
    boids.push(new Boid(canvas.width / 2, canvas.height / 2));
    updateCount();
}

// Attraction point for long press
let attractionPoint = null;
let pressTimer = null;
let isLongPress = false;

// Handle mouse/touch input
function handleStart(x, y) {
    isLongPress = false;

    pressTimer = setTimeout(() => {
        isLongPress = true;
        attractionPoint = { x, y };
    }, 300); // 300ms for long press
}

function handleEnd(x, y) {
    clearTimeout(pressTimer);

    if (!isLongPress) {
        // Short press - add boid
        boids.push(new Boid(x, y));
        updateCount();
    }

    isLongPress = false;
    attractionPoint = null;
}

function handleMove(x, y) {
    if (isLongPress) {
        attractionPoint = { x, y };
    }
}

// Mouse events
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleStart(x, y);
});

canvas.addEventListener('mouseup', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleEnd(x, y);
});

canvas.addEventListener('mousemove', (e) => {
    if (isLongPress) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        handleMove(x, y);
    }
});

// Touch events
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    handleStart(x, y);
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    handleEnd(x, y);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (isLongPress) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        handleMove(x, y);
    }
});

// Toggle panel
const toggleBtn = document.getElementById('toggleBtn');
const controlPanel = document.getElementById('controlPanel');

toggleBtn.addEventListener('click', () => {
    const isHidden = controlPanel.classList.contains('hidden');

    if (isHidden) {
        controlPanel.classList.remove('hidden');
        toggleBtn.classList.add('active');
    } else {
        controlPanel.classList.add('hidden');
        toggleBtn.classList.remove('active');
    }
});

// Start with panel hidden
controlPanel.classList.add('hidden');

// Controls
document.getElementById('separation').addEventListener('input', (e) => {
    params.separation = parseFloat(e.target.value);
    document.getElementById('separationValue').textContent = params.separation.toFixed(1);
});

document.getElementById('alignment').addEventListener('input', (e) => {
    params.alignment = parseFloat(e.target.value);
    document.getElementById('alignmentValue').textContent = params.alignment.toFixed(1);
});

document.getElementById('cohesion').addEventListener('input', (e) => {
    params.cohesion = parseFloat(e.target.value);
    document.getElementById('cohesionValue').textContent = params.cohesion.toFixed(1);
});

document.getElementById('resetBtn').addEventListener('click', () => {
    init();
});

function updateCount() {
    document.getElementById('count').textContent = boids.length;
}

// Animation loop
function animate() {
    // Dark background with trail effect
    ctx.fillStyle = 'rgba(20, 24, 35, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sort boids by depth (back to front)
    boids.sort((a, b) => a.depth - b.depth);

    for (let boid of boids) {
        boid.edges();
        boid.flock(boids, params, attractionPoint);
        boid.update();
        boid.show();
    }

    // Draw attraction point indicator
    if (attractionPoint) {
        ctx.beginPath();
        ctx.arc(attractionPoint.x, attractionPoint.y, 20, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(attractionPoint.x, attractionPoint.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    }

    requestAnimationFrame(animate);
}

// Start
init();
animate();
