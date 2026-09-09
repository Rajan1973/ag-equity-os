/**
 * Equity OS - Relative Rotation Graph (RRG) HTML5 Canvas Engine
 */

class RRGChart {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.data = null;
    this.trailWeeks = 5;
    this.hoveredIndex = null;
    this.animating = false;
    this.animFrame = 0;

    // Chart margins & boundaries
    this.margin = { top: 40, right: 40, bottom: 50, left: 60 };
    
    // Scale ranges for (RS-Ratio, RS-Momentum) centered around 100
    this.minRatio = 94;
    this.maxRatio = 106;
    this.minMomentum = 94;
    this.maxMomentum = 106;

    this.initEvents();
  }

  setData(data) {
    this.data = data;
    this.render();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = rect.height;
    this.render();
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.data) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found = null;
      for (const item of this.data.indices) {
        const pt = this.valToPos(item.rsRatio, item.rsMomentum);
        const dist = Math.hypot(mouseX - pt.x, mouseY - pt.y);
        if (dist < 18) {
          found = item;
          break;
        }
      }

      if (this.hoveredIndex !== found) {
        this.hoveredIndex = found;
        this.render();
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (this.hoveredIndex) {
        this.hoveredIndex = null;
        this.render();
      }
    });
  }

  valToPos(ratio, momentum) {
    const plotW = this.width - this.margin.left - this.margin.right;
    const plotH = this.height - this.margin.top - this.margin.bottom;

    const x = this.margin.left + ((ratio - this.minRatio) / (this.maxRatio - this.minRatio)) * plotW;
    const y = this.margin.top + (1 - (momentum - this.minMomentum) / (this.maxMomentum - this.minMomentum)) * plotH;
    return { x, y };
  }

  render() {
    if (!this.width || !this.height) {
      this.resize();
      return;
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLight ? '#475569' : '#9ca3af';
    const gridColor = isLight ? '#e2e8f0' : '#1e293b';

    const origin = this.valToPos(100, 100);

    // 1. Draw 4 Quadrants
    // Top-Right: Leading (Green)
    ctx.fillStyle = isLight ? 'rgba(5, 150, 105, 0.08)' : 'rgba(16, 185, 129, 0.1)';
    ctx.fillRect(origin.x, this.margin.top, this.width - this.margin.right - origin.x, origin.y - this.margin.top);

    // Bottom-Right: Weakening (Yellow)
    ctx.fillStyle = isLight ? 'rgba(217, 119, 6, 0.08)' : 'rgba(245, 158, 11, 0.1)';
    ctx.fillRect(origin.x, origin.y, this.width - this.margin.right - origin.x, this.height - this.margin.bottom - origin.y);

    // Bottom-Left: Lagging (Red)
    ctx.fillStyle = isLight ? 'rgba(220, 38, 38, 0.08)' : 'rgba(239, 68, 68, 0.1)';
    ctx.fillRect(this.margin.left, origin.y, origin.x - this.margin.left, this.height - this.margin.bottom - origin.y);

    // Top-Left: Improving (Blue)
    ctx.fillStyle = isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(this.margin.left, this.margin.top, origin.x - this.margin.left, origin.y - this.margin.top);

    // Quadrant Watermark Labels
    ctx.font = 'bold 16px Archivo, sans-serif';
    ctx.textAlign = 'center';
    
    ctx.fillStyle = isLight ? 'rgba(5, 150, 105, 0.35)' : 'rgba(16, 185, 129, 0.3)';
    ctx.fillText('LEADING', (origin.x + this.width - this.margin.right) / 2, (this.margin.top + origin.y) / 2);

    ctx.fillStyle = isLight ? 'rgba(217, 119, 6, 0.35)' : 'rgba(245, 158, 11, 0.3)';
    ctx.fillText('WEAKENING', (origin.x + this.width - this.margin.right) / 2, (origin.y + this.height - this.margin.bottom) / 2);

    ctx.fillStyle = isLight ? 'rgba(220, 38, 38, 0.35)' : 'rgba(239, 68, 68, 0.3)';
    ctx.fillText('LAGGING', (this.margin.left + origin.x) / 2, (origin.y + this.height - this.margin.bottom) / 2);

    ctx.fillStyle = isLight ? 'rgba(37, 99, 235, 0.35)' : 'rgba(59, 130, 246, 0.3)';
    ctx.fillText('IMPROVING', (this.margin.left + origin.x) / 2, (this.margin.top + origin.y) / 2);

    // 2. Draw Gridlines & Center Axes
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let r = Math.ceil(this.minRatio); r <= this.maxRatio; r += 2) {
      const pos = this.valToPos(r, 100);
      ctx.beginPath();
      ctx.moveTo(pos.x, this.margin.top);
      ctx.lineTo(pos.x, this.height - this.margin.bottom);
      ctx.stroke();
    }

    for (let m = Math.ceil(this.minMomentum); m <= this.maxMomentum; m += 2) {
      const pos = this.valToPos(100, m);
      ctx.beginPath();
      ctx.moveTo(this.margin.left, pos.y);
      ctx.lineTo(this.width - this.margin.right, pos.y);
      ctx.stroke();
    }

    // Main Center Axes (100, 100)
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = isLight ? '#64748b' : '#475569';

    ctx.beginPath();
    ctx.moveTo(origin.x, this.margin.top);
    ctx.lineTo(origin.x, this.height - this.margin.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.margin.left, origin.y);
    ctx.lineTo(this.width - this.margin.right, origin.y);
    ctx.stroke();

    // Axis Labels
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText('JdK RS-Ratio (Relative Strength vs Nifty 50) ➔', this.width / 2, this.height - 15);

    ctx.save();
    ctx.translate(18, this.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('JdK RS-Momentum ➔', 0, 0);
    ctx.restore();

    if (!this.data) return;

    // 3. Render Index Rotation Trails & Current Points
    this.data.indices.forEach(item => {
      const isHovered = this.hoveredIndex && this.hoveredIndex.symbol === item.symbol;
      const alpha = this.hoveredIndex ? (isHovered ? 1.0 : 0.25) : 0.85;

      let color = '#3b82f6';
      if (item.currentQuadrant === 'Leading') color = '#10b981';
      else if (item.currentQuadrant === 'Weakening') color = '#f59e0b';
      else if (item.currentQuadrant === 'Lagging') color = '#ef4444';

      // Draw Trail Line
      if (item.trail && item.trail.length > 1) {
        ctx.beginPath();
        const startPos = this.valToPos(item.trail[0].x, item.trail[0].y);
        ctx.moveTo(startPos.x, startPos.y);

        for (let i = 1; i < item.trail.length; i++) {
          const pt = this.valToPos(item.trail[i].x, item.trail[i].y);
          ctx.lineTo(pt.x, pt.y);
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.globalAlpha = alpha;
        ctx.setLineDash([]);
        ctx.stroke();

        // Trail dots
        item.trail.forEach((tPt, idx) => {
          const p = this.valToPos(tPt.x, tPt.y);
          ctx.beginPath();
          ctx.arc(p.x, p.y, idx === item.trail.length - 1 ? 6 : 3, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        });
      }

      // Current Head Node
      const currentPos = this.valToPos(item.rsRatio, item.rsMomentum);
      
      // Node Outer Glow
      ctx.beginPath();
      ctx.arc(currentPos.x, currentPos.y, isHovered ? 10 : 7, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Node Label
      ctx.font = 'bold 11px Archivo, sans-serif';
      ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
      ctx.textAlign = 'left';
      ctx.globalAlpha = alpha;
      ctx.fillText(item.name, currentPos.x + 12, currentPos.y + 4);
    });

    ctx.globalAlpha = 1.0;

    // 4. Render Hover Tooltip Box if hovered
    if (this.hoveredIndex) {
      this.drawTooltip(this.hoveredIndex);
    }
  }

  drawTooltip(item) {
    const ctx = this.ctx;
    const pos = this.valToPos(item.rsRatio, item.rsMomentum);

    const boxW = 200;
    const boxH = 90;
    let boxX = pos.x + 15;
    let boxY = pos.y - 45;

    if (boxX + boxW > this.width - 20) boxX = pos.x - boxW - 15;
    if (boxY + boxH > this.height - 20) boxY = this.height - boxH - 20;
    if (boxY < 20) boxY = 20;

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(17, 24, 39, 0.95)';
    ctx.strokeStyle = isLight ? '#cbd5e1' : '#3b82f6';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 13px Archivo, sans-serif';
    ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(item.name, boxX + 12, boxY + 22);

    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.fillStyle = isLight ? '#475569' : '#9ca3af';
    ctx.fillText(`Quadrant: ${item.currentQuadrant}`, boxX + 12, boxY + 42);
    ctx.fillText(`RS-Ratio: ${item.rsRatio}`, boxX + 12, boxY + 60);
    ctx.fillText(`RS-Momentum: ${item.rsMomentum}`, boxX + 12, boxY + 76);
  }
}

window.RRGChart = RRGChart;
