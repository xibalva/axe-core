function accesskeysAfter(results) {
  const count = {};
  const seen = {};

  return results
    .filter(result => {
      // remove non-visible nodes
      if (!result.data) {
        return false;
      }

      const key = result.data.toLowerCase();
      count[key] = count[key] || 0;
      count[key]++;

      if (!seen[key]) {
        seen[key] = result;
        result.result = false;
        result.relatedNodes = [];
        return true;
      }

      // if the element has related nodes (meaning it has an
      // actualNode we can reference) then make sure the first
      // result adds the node to its list of related nodes
      if (result.relatedNodes.length) {
        seen[key].relatedNodes.push(result.relatedNodes[0]);
      }

      seen[key].result = true;
      return false;
    });
}

export default accesskeysAfter;
