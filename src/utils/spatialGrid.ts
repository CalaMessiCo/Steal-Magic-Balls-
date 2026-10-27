export class SpatialGrid<T extends { id: string; x: number; y: number }> {
  public cellSize: number;
  public width: number;
  public height: number;
  private cols: number;
  private rows: number;
  private cells: Map<number, T[]> = new Map();

  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
  }

  private getKey(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  public clear() {
    this.cells.clear();
  }

  public insert(item: T) {
    const cx = Math.max(0, Math.min(this.cols - 1, Math.floor(item.x / this.cellSize)));
    const cy = Math.max(0, Math.min(this.rows - 1, Math.floor(item.y / this.cellSize)));
    const key = this.getKey(cx, cy);
    let list = this.cells.get(key);
    if (!list) {
      list = [];
      this.cells.set(key, list);
    }
    list.push(item);
  }

  public queryRadius(x: number, y: number, radius: number): T[] {
    const results: T[] = [];
    const minCx = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCx = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const minCy = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxCy = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));
    const r2 = radius * radius;

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const list = this.cells.get(this.getKey(cx, cy));
        if (list) {
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            const dx = item.x - x;
            const dy = item.y - y;
            if (dx * dx + dy * dy <= r2) {
              results.push(item);
            }
          }
        }
      }
    }
    return results;
  }

  public queryRect(minX: number, minY: number, maxX: number, maxY: number): T[] {
    const results: T[] = [];
    const minCx = Math.max(0, Math.floor(minX / this.cellSize));
    const maxCx = Math.min(this.cols - 1, Math.floor(maxX / this.cellSize));
    const minCy = Math.max(0, Math.floor(minY / this.cellSize));
    const maxCy = Math.min(this.rows - 1, Math.floor(maxY / this.cellSize));

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const list = this.cells.get(this.getKey(cx, cy));
        if (list) {
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (item.x >= minX && item.x <= maxX && item.y >= minY && item.y <= maxY) {
              results.push(item);
            }
          }
        }
      }
    }
    return results;
  }
}
