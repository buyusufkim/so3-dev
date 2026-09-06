function addOneDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().substring(0, 10);
}
console.log(addOneDay('2024-02-28')); // Expect 2024-02-29
console.log(addOneDay('2024-02-29')); // Expect 2024-03-01
