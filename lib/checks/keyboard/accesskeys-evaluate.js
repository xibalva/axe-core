import { isVisible } from '../../commons/dom';

function accesskeysEvaluate(node, options, virtualNode) {
  if (isVisible(virtualNode, false)) {
    this.data(virtualNode.attr('accesskey'));

    if (node) {
      this.relatedNodes([node]);
    }
  }
  return true;
}

export default accesskeysEvaluate;
