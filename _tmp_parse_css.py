import json, io

p = r"C:\Users\PC\.cursor\browser-logs\cdp-response-CSS.getMatchedStylesForNode-2026-11-12T09-50-11-213Z.json"
d = json.load(io.open(p, encoding='utf-8'))

def rules(m):
    for r in m.get('matchedCSSRules', []):
        rule = r['rule']
        sel = rule.get('selectorList', {}).get('text', '')
        props = [(p_['name'], p_.get('value'), p_.get('important')) for p_ in rule.get('style', {}).get('cssProperties', []) if p_['name'].startswith('grid') or p_['name'] in ('gap', 'display')]
        if props:
            print(sel[:90], '::', props)

rules(d)
print('--- inline ---')
print([(x['name'], x.get('value'), x.get('important')) for x in d.get('inlineStyle', {}).get('cssProperties', [])])
