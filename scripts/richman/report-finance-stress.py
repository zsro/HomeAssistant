"""Record checked S2-05a artifacts; route plans alone are never UI acceptance."""
import hashlib
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parents[2]
temporary = pathlib.Path('/private/tmp')
tests = (temporary / 'richman-05a-tests.log').read_text()
files = re.search(r'Test Files\s+(\d+) passed \((\d+)\)', tests)
cases = re.search(r'Tests\s+(\d+) passed \((\d+)\)', tests)
assert files and files[1] == files[2] == '118'
assert cases and cases[1] == cases[2] == '1735'
assert 'Unhandled Errors' not in tests
build = (temporary / 'richman-05a-build.log').read_text()
assert 'built in' in build and 'error TS' not in build
lint = (temporary / 'richman-05a-lint.log').read_text()
assert '> eslint .' in lint and 'error' not in lint.lower()

def read(path):
    return json.loads(path.read_text())

source = read(root / 'docs/richman/s2-05a-sources.json')
assert len(source['sources']) == 5 and len(source['anchors']) == 14
routes = []
for kind, count in [('rent',2), ('dividend',4), ('loan',3)]:
    stem = root / f'frontend/src/features/richman/game/fixtures/finance-stress-v44-{kind}'
    manifest = read(pathlib.Path(str(stem) + '-manifest.json'))
    actual = temporary / f'richman-unified-ui-05a-{kind}-{count}'
    replay = (actual / 'replay.json').read_bytes()
    # Archived JSON is compact; parse/re-encode only to discard whitespace.
    compact = json.dumps(json.loads(replay), ensure_ascii=False, separators=(',', ':')).encode()
    assert hashlib.sha256(compact).hexdigest() == manifest['hashes']['replay']
    assert manifest['report']['normalSpeed'] and manifest['report']['errors'] == []
    assert manifest['report']['cleanup'] == {'raf': 0, 'canvas': 0}
    assert manifest['report']['calendarCommon'] is True
    routes.append({**manifest, 'replay': str(stem.relative_to(root)) + '-replay.json',
                   'screenshots': str(actual)})

# Runtime and default mode are unchanged; prior 04c default UI evidence is retained, not a new check.
result={
 'stage':'S2-05a','date':'2026-10-07','rulesId':'japan-events-candidate-v44','fingerprint':'f9dbb7e9','semanticIncrement':False,'runtimeChanged':False,'s2_05Complete':False,
 'preserved':{'s2_03CandidateClosed':True,'s2_04CandidateClosed':True,'items':43,'news':36,'japanFortuneSlots':37,'magicEffects':12,'minigames':3,'oldFixtureJsonUnchanged':262,'allVersionPlayerCases':132},
 'sourceAudit':{'files':5,'anchors':14,'referenceCommit':source['referenceCommit'],'nativeWindowsExecution':False},
 'checks':{'frontend':{'passed':1735,'files':118,'maxWorkers':2,'newDomain':14,'newActualReplay':3,'allVersionPlayerCases':132},'lint':'passed','build':'passed; existing large-chunk warning','defaultUI':'runtime/default unchanged; retain 04c dev/built checks, not newly claimed'},
 'originalMapBrowser':{'routes':routes,'commands':sum(x['commands'] for x in routes),'normalSpeed':True,'authOnlyFixture':True,'gameStateInjection':False,'bankruptcies':sum(x['bankruptcies'] for x in routes),'publicStock':sum(x['stockPublic'] for x in routes),'publicAuction':sum(x['auctionPaid'] for x in routes),'loanActual':sum(x['loanActual'] for x in routes),'dividendActual':sum(x['dividendActual'] for x in routes),'lotteryPrize':sum(x['prizes'] for x in routes),'forcedRentSales':sum(len(x['forced']) for x in routes),'continuations':sorted({p for x in routes for p in x['prefixes']}),'independentAccounting':'frozen dividend companies/nets and live seat balances; ordinary average invariants; necessary rent sale quantity/bank/remaining average and subsequent rent receipt; public exit stock float-price truncation and zero average; company ranking validity; auction cash/public actual; callback IDs/order; same-day lottery award/public reconciliation; loan due/notice clearing; full replay and serialized prefixes',
 'uiAssertions':'normal real commands; calendar/pause/reset-cancel/fullscreen/390px; auction responder and disabled paused bids; final obligation/actual/unpaid/stock/auction receipt text; dividend completed cursor or loan disposal amount; maturity notice verified in actual replay; reset and zero RAF/canvas; actual exported state equals legal plan'},
 'domainOnly':['positive partial liquid debit for v44 negative dividend (current original-map dividend route paid zero; historical v35 covered nonzero)','2p last-survivor skips stock/estate sale and later dividend/lottery/loan; retained averages are deliberate','2/3/4p exact maturity exhaustion retains shares/rights and ticks once','two negative holders with frozen 1:3 allocations and separate exits','earlier auction bid makes later negative holder insolvent without recomputing net','same-day dividend auction -> awarded lottery -> second incoming loan disposal','bank rejection/noLoans/detention do not prevent maturity collection','two-stock necessary rent sale partial/empty average and ownership transfer under market closure'],
 'notNewBrowserAcceptance':['two negative holders or auction spending causing a second bankruptcy in the same batch','same-day lottery prize followed by loan disposal (separate date routes; domain combined)','last-survivor negative dividend/loan with current averages (domain)','G7 used after or across payment/auction/date world restoration','free/redirect/revenge/immunity/alliance payment reactions','stock-tax multiple-holder exits','individual/global halt or manual red/black card stress','new minigame input/collision; timer-only returns','every interim ledger label; exported state checked independently'],
 'resolvedValidationIssues':['First full suite passed assertions but reported Vitest onTaskUpdate RPC timeout during synchronous long replay verification. Added periodic async yields in verification only; reran full suite without unhandled errors.','Initial pause test used auction responder for a non-auction command; fixed helper to use active player for pause.', 'Rent route generator supplied construction type while declining a purchase; fixed legal-command generation.', 'Loan search initially abandoned an already-exited payer while its disposal callback was still pending; continue pending disposal to completion. These were harness issues; no product rules changed.'],
 'remainingDifferences':source['retainedDifferences'],
 'next':'S2-05b: reaction/effect-chain regression on current v44, prioritize free/redirect/alliance actual rent payer and forced liquidation, detention/attack immunity/redirect and outer turn return, retain finance stress routes; v45 only for new semantics',
 'release':{'committed':False,'pushed':False,'deployed':False}
}
(root/'docs/richman/s2-05a-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('S2-05a',result['checks']['frontend']['passed'],'tests;',result['originalMapBrowser']['commands'],'actual UI commands')
