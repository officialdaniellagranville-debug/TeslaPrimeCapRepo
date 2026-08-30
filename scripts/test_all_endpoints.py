import subprocess, json, sys, os

token = os.environ['TOKEN']

def api(method, path, tk=None, body=None):
    cmd = ['curl', '-s', '-X', method, f'https://teslaprimecap.com{path}', '-H', 'Content-Type: application/json']
    if tk:
        cmd += ['-H', f'Authorization: Bearer {tk}']
    if body:
        cmd += ['-d', json.dumps(body)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    try:
        return json.loads(r.stdout)
    except:
        return {'error': r.stdout[:200], 'success': False}

tests = [
    ('WALLET', 'GET', '/api/wallet', True),
    ('NOTIFICATIONS', 'GET', '/api/notifications', True),
    ('UNREAD COUNT', 'GET', '/api/notifications/unread-count', True),
    ('PLANS', 'GET', '/api/plans', False),
    ('VEHICLES', 'GET', '/api/vehicles', False),
    ('REFERRAL', 'GET', '/api/referral', True),
    ('TRANSACTIONS', 'GET', '/api/transactions?page=1', True),
    ('DEPOSIT HISTORY', 'GET', '/api/deposits/history?page=1', True),
    ('WITHDRAWAL HISTORY', 'GET', '/api/withdrawals/history?page=1', True),
    ('INVESTMENT HISTORY', 'GET', '/api/investments/history?page=1', True),
    ('ACTIVE INVESTMENTS', 'GET', '/api/investments/active', True),
    ('PAYMENT ADDRESSES', 'GET', '/api/payment-addresses', False),
    ('SITE SETTINGS', 'GET', '/api/site-settings', False),
]

results = {'PASS': 0, 'FAIL': 0}
for name, method, path, needs_auth in tests:
    tk = token if needs_auth else None
    d = api(method, path, tk)
    ok = d.get('success', False)
    status = 'PASS' if ok else 'FAIL'
    results[status] += 1
    detail = ''
    if ok:
        if isinstance(d.get('data'), list):
            detail = f'{len(d["data"])} items'
        elif isinstance(d.get('data'), dict):
            if 'total' in d['data']:
                detail = f'total: {d["data"]["total"]}'
            elif 'myReferralCode' in d['data']:
                detail = f'code: {d["data"]["myReferralCode"]}'
            elif 'companyName' in d['data']:
                detail = f'{d["data"]["companyName"]}'
            elif 'liveWallet' in d['data']:
                detail = f'live: ${d["data"]["liveWallet"]["balance"]} demo: ${d["data"]["demoWallet"]["balance"]}'
            elif 'count' in d['data']:
                detail = f'count: {d["data"]["count"]}'
            else:
                detail = 'ok'
        else:
            detail = 'ok'
    else:
        err = d.get('error', 'unknown')
        if isinstance(err, dict):
            detail = err.get('message', str(err))[:60]
        else:
            detail = str(err)[:60]
    print(f'{"PASS" if ok else "FAIL"} | {name:25s} | {detail}')

print(f'\nResults: {results["PASS"]} passed, {results["FAIL"]} failed out of {results["PASS"]+results["FAIL"]}')
