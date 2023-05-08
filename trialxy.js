function calculatePosition(rssi1, rssi2, rssi3) {
  const d1 = rssiToDistance0(rssi1);
  const d2 = rssiToDistance1(rssi2);
  const d3 = rssiToDistance2(rssi3);
  // console.log(d1, d2, d3);

  // Find the position of the target device using trilateration
  //const x1 = 2.43, y1 = 0; // position of the first reference point
  //const x2 = 0, y2 = 3.82; // position of the second reference point
  //const x3 = 7.24, y3 = 5.66; // position of the third reference point

    // Find the position of the target device using trilateration
    const x1 = 2.43, y1 = 5.66; // position of the first reference point
    const x2 = 0, y2 = 1.84; // position of the second reference point
    const x3 = 7.24, y3 = 0; // position of the third reference point

  // Calculate the coefficients of a system of equations to solve for the x and y coordinates of the target device
  const A = 2 * x2 - 2 * x1;
  const B = 2 * y2 - 2 * y1;
  const C = d1 * d1 - d2 * d2 - x1 * x1 + x2 * x2 - y1 * y1 + y2 * y2;
  const D = 2 * x3 - 2 * x2;
  const E = 2 * y3 - 2 * y2;
  const F = d2 * d2 - d3 * d3 - x2 * x2 + x3 * x3 - y2 * y2 + y3 * y3;

  // Solve for the x and y coordinates of the target device
  const x = (C * E - F * B) / (E * A - B * D);
  const y = (C * D - A * F) / (B * D - A * E);

  return { x, y, d1, d2, d3 };
}