import type {GameState,EventPayload} from './engine';
export const INSURANCE_ID='japan-events-candidate-v29';
export const INSURANCE_TERMS=[5,3,30,20,15,10] as const;
export type PolicyReceipt={playerId:string;companyId:string;ownerId:string;draw:number;before:number;after:number;base:number};
export type InsuranceClaim={playerId:string;companyId:string;reason:string;amount:number;term:number;cashBefore:number;cashAfter:number;fundsBefore:number;fundsAfter:number;cumulativeBefore:number;cumulativeAfter:number};
export type InsuranceState={terms:Record<string,number>;policy:PolicyReceipt|null;claims:InsuranceClaim[]};
export type InsuranceDecision={kind:'insurance';id:string;companyId:string;ownerId:string};
export type InsuranceEvent={type:'insurancePolicy';receipt:PolicyReceipt}|{type:'insuranceClaim';receipt:InsuranceClaim}|{type:'insuranceClock';playerId:string;before:number;after:number};
type Emit=(e:EventPayload)=>void;
/** Source checks the entire nonzero byte: 128 remains covered until the next own action. */
export function claimInsurance(s:GameState,id:string,amount:number,reason:string,emit:Emit=()=>{}){
 const insurance=s.news?.business?.insurance;
 if((s.rulesId!==INSURANCE_ID && (s.rulesId !== 'japan-events-candidate-v30' && (s.rulesId !== 'japan-events-candidate-v31' && (s.rulesId !== 'japan-events-candidate-v32' && (s.rulesId !== 'japan-events-candidate-v33' && (s.rulesId !== 'japan-events-candidate-v34' && (s.rulesId !== 'japan-events-candidate-v35' && (s.rulesId !== 'japan-events-candidate-v36' && (s.rulesId !== 'japan-events-candidate-v37' && (s.rulesId !== 'japan-events-candidate-v38' && (s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47'))))))))))))))))))||!insurance?.terms[id]||s.finance!.eliminated.includes(id)||amount<=0)return null;
 const c=s.news!.business!.companies.find(c=>c.id==='japan:company:4')!,b=s.economy!.balances[id];
 const receipt:InsuranceClaim={playerId:id,companyId:c.id,reason,amount,term:insurance.terms[id],cashBefore:b.cash,cashAfter:b.cash+amount,fundsBefore:c.funds,fundsAfter:(c.funds-amount)|0,cumulativeBefore:c.cumulative,cumulativeAfter:(c.cumulative-amount)|0};
 b.cash=receipt.cashAfter;c.funds=receipt.fundsAfter;c.cumulative=receipt.cumulativeAfter;
 insurance.claims.push(receipt);insurance.claims=insurance.claims.slice(-12);emit({type:'insuranceClaim',receipt:structuredClone(receipt)});return receipt;
}
export function tickInsurance(s:GameState,id:string,emit:Emit){const i=s.news?.business?.insurance;if(!i)return;const before=i.terms[id],after=before&128?0:before===1?128:Math.max(0,before-1);i.terms[id]=after;if(before!==after)emit({type:'insuranceClock',playerId:id,before,after});}
