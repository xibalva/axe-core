import cache from '../base/cache';
import getNodeAttributes from './get-node-attributes';
import { matchesExpression, convertSelector, matchExpression } from './matches';

function createLocalVariables(vNodes, anyLevel, thisLevel, parentShadowId) {
	let retVal = {
		vNodes: vNodes.slice(),
		anyLevel: anyLevel,
		thisLevel: thisLevel,
		parentShadowId: parentShadowId
	};
	retVal.vNodes.reverse();
	return retVal;
}

function matchExpressions(domTree, expressions) {
	let stack = [];
	let vNodes = Array.isArray(domTree) ? domTree : [domTree];
	let currentLevel = createLocalVariables(
		vNodes,
		expressions,
		[],
		domTree[0].shadowId
	);
	let result = [];

	while (currentLevel.vNodes.length) {
		let vNode = currentLevel.vNodes.pop();
		let childOnly = []; // we will add hierarchical '>' selectors here
		let childAny = [];
		let combined = currentLevel.anyLevel.slice().concat(currentLevel.thisLevel);
		let added = false;
		// see if node matches
		for (let i = 0; i < combined.length; i++) {
			let exp = combined[i];
			if (
				(!exp[0].id || vNode.shadowId === currentLevel.parentShadowId) &&
				matchesExpression(vNode, exp[0])
			) {
				if (exp.length === 1) {
					if (!added) {
						result.push(vNode);
						added = true;
					}
				} else {
					let rest = exp.slice(1);
					if ([' ', '>'].includes(rest[0].combinator) === false) {
						throw new Error(
							'axe.utils.querySelectorAll does not support the combinator: ' +
								exp[1].combinator
						);
					}
					if (rest[0].combinator === '>') {
						// add the rest to the childOnly array
						childOnly.push(rest);
					} else {
						// add the rest to the childAny array
						childAny.push(rest);
					}
				}
			}
			if (
				(!exp[0].id || vNode.shadowId === currentLevel.parentShadowId) &&
				currentLevel.anyLevel.includes(exp)
			) {
				childAny.push(exp);
			}
		}

		if (vNode.children && vNode.children.length) {
			stack.push(currentLevel);
			currentLevel = createLocalVariables(
				vNode.children,
				childAny,
				childOnly,
				vNode.shadowId
			);
		}
		// check for "return"
		while (!currentLevel.vNodes.length && stack.length) {
			currentLevel = stack.pop();
		}
	}
	return result;
}

/**
 * querySelectorAllFilter implements querySelectorAll on the virtual DOM with
 * ability to filter the returned nodes using an optional supplied filter function
 *
 * @method querySelectorAllFilter
 * @memberof axe.utils
 * @param {NodeList} domTree flattened tree collection to search
 * @param {String} selector String containing one or more CSS selectors separated by commas
 * @param {Function} filter function (optional)
 * @return {Array} Elements matched by any of the selectors and filtered by the filter function
 */
function querySelectorAllFilter(domTree, selector, filter) {
	domTree = Array.isArray(domTree) ? domTree : [domTree];

	// each node in the tree will have it's own selector map
	// when finding nodes. only prior selectors will be
	// in the map so it will only hold what we are interested in
	const selectorMap = domTree[0]._selectorMap || {};

	const originalExpressions = convertSelector(selector);
	const expressions = [];
	let matchedNodes = [];

	originalExpressions.forEach(expression => {
		const exp = expression[expression.length - 1];
		const isGlobalSelector = exp.tag === '*' && !exp.attributes && !exp.id && !exp.classes;
		let nodes;

		if (isGlobalSelector && selectorMap['*']) {
			nodes = [...selectorMap['*']];
		}
		else if (exp.tag !== '*' && selectorMap[exp.tag]) {
			nodes = [...selectorMap[exp.tag]];
		}
		else if (exp.id && selectorMap[exp.id]) {
			nodes = [...selectorMap[exp.id]];
		}
		else if (exp.classes && selectorMap.class) {
      nodes = [...selectorMap.class];
    }
    else if (exp.attributes) {
      for (let i = 0; i < exp.attributes.length; i++) {
        let attrName = exp.attributes[i].key;
        if (selectorMap[attrName]) {
          nodes = [...selectorMap[attrName]];
          break;
        }
      }
    }

    // no selector map for this expression so we'll have to
    // search the tree for it only if we haven't already
    // done a global node search (meaning we should have
    // cached everything already and this selector is
    // not anywhere in the tree)
    if (!nodes) {

    	if (!selectorMap._allNodesFound) {
      	expressions.push(expression);

      	if (isGlobalSelector) {
      		selectorMap._allNodesFound = true;
      	}
      }
      return;
    }

    // filter by the expression
    if (!isGlobalSelector) {
      nodes = nodes.filter(function(node) {
        return matchExpression(node, exp);
      });
    }

    // filter by parent selector
    if (expression.length > 1) {
      let combinator = exp.combinator;
      nodes = nodes.filter(function(node) {
        let currNode = node;
        let parentSelectors = expression.slice(0, expression.length - 1);
        let result;
        while (parentSelectors.length) {
          let parentExp = parentSelectors.pop();
          if (combinator === '>') {
            result = matchExpression(currNode.parent, parentExp);
          } else if (combinator === ' ') {
            while (currNode.parent) {
              result = matchExpression(currNode.parent, parentExp);
              if (result) {
                break;
              } else {
                currNode = currNode.parent;
              }
            }
          } else {
            throw new Error('axe.utils.querySelectorAll does not support the combinator: ' + combinator);
          }
          if (result) {
            currNode = currNode.parent;
            combinator = parentExp.combinator;
          } else {
            return false;
          }
        }
        return result;
      });
    }

    nodes.forEach(function(node) {
      if (!matchedNodes.includes(node)) {
        matchedNodes.push(node);
      }
    });
	});

	function cacheSelector(key, node) {
		 selectorMap[key] = selectorMap[key] || new Set;
		 selectorMap[key].add(node);
	}


	// any expressions the selector map didn't have
	if (expressions.length) {
		let nodes = matchExpressions(domTree, expressions);

		nodes.forEach(function(node) {
      if (!matchedNodes.includes(node)) {
        matchedNodes.push(node);
      }

	    // cache information about the node
	    cacheSelector(node.props.nodeName, node);
	    cacheSelector(node.props.id, node);

	    // TODO: won't work for non virtual-nodes
	    const attrs = getNodeAttributes(node.actualNode);
	    for (let i = 0; i < attrs.length; i++) {
	    	const attr = attrs[i];
	    	cacheSelector(attr.name, node);
	    }
	  });

	  domTree[0]._selectorMap = selectorMap;
	}

	if (filter) {
    matchedNodes = matchedNodes.filter(function(node) {
      return filter(node);
    });
  }

  return matchedNodes;



	// // find any cached expressions
	// for (let i = 0; i < originalExpressions.length; i++) {
	// 	const expression = originalExpressions[i];

	// 	const nodes = cachedSelectors[expression[0].tag];
	// 	if (nodes) {
	// 		foundNodes = foundNodes.concat(nodes);
	// 	}
	// 	else {
	// 		expressions.push(expression);
	// 	}
	// }

	// if (expressions.length) {
	// 	let vNodes = matchExpressions(domTree, expressions);
	// 	foundNodes = foundNodes.concat(vNodes);

	// 	// to speed up finding elements we can cache all nodes found
	// 	// that match the selector qualities we are interested in
	// 	// and return those for future queries
	// 	vNodes.forEach(vNode => {
	// 		expressions.forEach(expression => {
	// 			const exp = expression[0];
	// 			if (matchExpression(vNode, exp)) {
	// 				cachedSelectors[exp.tag] = cachedSelectors[exp.tag] || [];
	// 				cachedSelectors[exp.tag].push(vNode);
	// 			}
	// 		});
	// 	});

	// 	cache.set('cachedSelectors', cachedSelectors);
	// }

	// if (filter) {
	// 	return foundNodes.filter(filter);
	// }

	// return foundNodes;
}

export default querySelectorAllFilter;
