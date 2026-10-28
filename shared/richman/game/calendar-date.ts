import holidays from './calendar-japan.json';
export const CALENDAR_SCOPE='日本37槽命运与36条新闻已开放；日期、交易日、月息及贷款到期已接入。原破产强拍、完整公司/保险与其他日历事件仍未实现。';
const monthDays=(y:number,m:number)=>m===2&&y%4===0?29:[31,28,31,30,31,30,31,31,30,31,30,31][m-1];
const parts=(s:string)=>s.split('-').map(Number);
export function validStartDate(s:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const[y,m,d]=parts(s);return y>=1998&&y<=2099&&m>=1&&m<=12&&d>=1&&d<=monthDays(y,m);}
export function dayNumber(s:string){const[y,m,d]=parts(s);let n=d-1;for(let a=1998;a<y;a++)n+=a%4===0?366:365;for(let a=1;a<m;a++)n+=monthDays(y,a);return n;}
export function addDays(s:string,n:number){let[y,m,d]=parts(s);for(let i=0;i<n;i++){if(++d>monthDays(y,m)){d=1;if(++m>12){m=1;y++;}}}return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
export const weekday=(s:string)=>(dayNumber(s)+4)%7;
export function calendarClosed(s:string){if(weekday(s)===0)return '周日休市';const[,month,day]=parts(s),entry=holidays.find(h=>h.month===month&&h.day===day);return entry?.closed?'日本固定节日休市':'';}
export function dueDate(s:string){let d=addDays(s,90);while(calendarClosed(d))d=addDays(d,1);return d;}
