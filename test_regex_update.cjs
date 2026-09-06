const regex = /UPDATE\s+appointments\s+SET\s+([^W]+)WHERE/igs;
const str = "UPDATE appointments SET status = 'no_show', completed_at = 'x' WHERE id = ?";
console.log([...str.matchAll(regex)].map(m => m[1]));
