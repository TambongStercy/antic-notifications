import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

const AnticBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // ANTIC brand colors from the logo - using darker, more visible shades
        const colors = {
            blue: '#0D47A1',        // Darker ANTIC Blue (A, N)
            red: '#C62828',          // Darker ANTIC Red (T)
            yellow: '#F57C00',       // Darker ANTIC Yellow (I, C)
            lightBlue: '#1976D2',   // Medium blue
            lightRed: '#D32F2F',     // Medium red
            lightYellow: '#FF9800',  // Medium yellow
        };

        // Geometric particles for modern look
        const particles: Array<{
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
            color: string;
            opacity: number;
            rotation: number;
            rotationSpeed: number;
        }> = [];

        // Initialize particles
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 4 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                color: Object.values(colors)[Math.floor(Math.random() * 6)],
                opacity: Math.random() * 0.3 + 0.1,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02
            });
        }

        // Connection lines between particles using ANTIC colors
        const drawConnections = () => {
            const connectionColors = [colors.blue, colors.red, colors.yellow];
            
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 120) {
                        const opacity = (120 - distance) / 120 * 0.15;
                        const colorIndex = (i + j) % 3;
                        ctx.strokeStyle = connectionColors[colorIndex];
                        ctx.lineWidth = 0.8;
                        ctx.globalAlpha = opacity;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1;
        };

        // Draw geometric shapes
        const drawParticles = () => {
            particles.forEach(particle => {
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate(particle.rotation);
                ctx.globalAlpha = particle.opacity;
                
                // Draw different shapes for variety
                const shapeType = Math.floor(particle.size);
                ctx.fillStyle = particle.color;
                
                switch (shapeType % 3) {
                    case 0: // Circle
                        ctx.beginPath();
                        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case 1: // Square
                        ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
                        break;
                    case 2: // Triangle
                        ctx.beginPath();
                        ctx.moveTo(0, -particle.size);
                        ctx.lineTo(-particle.size, particle.size);
                        ctx.lineTo(particle.size, particle.size);
                        ctx.closePath();
                        ctx.fill();
                        break;
                }
                
                ctx.restore();
            });
        };

        // Animation loop
        const animate = () => {
            // Clear canvas with ANTIC-inspired gradient background
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#FAFAFA');
            gradient.addColorStop(0.3, '#E3F2FD');  // Very light blue
            gradient.addColorStop(0.6, '#FFF3E0');  // Very light yellow
            gradient.addColorStop(1, '#FFEBEE');    // Very light red
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update particles
            particles.forEach(particle => {
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                particle.rotation += particle.rotationSpeed;

                // Bounce off edges
                if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
                if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;

                // Keep particles in bounds
                particle.x = Math.max(0, Math.min(canvas.width, particle.x));
                particle.y = Math.max(0, Math.min(canvas.height, particle.y));
            });

            // Draw connections first (behind particles)
            drawConnections();
            
            // Draw particles
            drawParticles();

            requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: -2,
                opacity: 0.6,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                }}
            />
        </Box>
    );
};

export default AnticBackground;