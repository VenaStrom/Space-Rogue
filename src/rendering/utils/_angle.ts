
export class Angle {
  private rads: number = 0;

  public get radians() {
    return this.rads;
  }
  public get degrees() {
    return this.rads * (180 / Math.PI);
  }

  public set radians(radians: number) {
    this.rads = radians;
  }
  public set degrees(degrees: number) {
    this.rads = degrees * (Math.PI / 180);
  }

  public static zero = Angle.fromDegrees(0);

  public static fromDegrees(degrees: number) {
    const angle = new Angle();
    angle.rads = degrees * (Math.PI / 180);
    return angle;
  }

  public static fromRadians(radians: number) {
    const angle = new Angle();
    angle.rads = radians;
    return angle;
  }
}