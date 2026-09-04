function extractAuditKeys(metadataStr) {
    const matches = [...metadataStr.matchAll(/'([a-zA-Z_]+)'\s*=>/g)];
    return matches.map(m => m[1]);
}
console.log(extractAuditKeys("['previous_status' => $lockedApp['status'], 'new_status' => $persisted['status'], 'completed_at' => $persisted['completed_at']]"));
