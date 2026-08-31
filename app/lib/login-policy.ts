export function normalizeGoogleEmail(value:string|undefined){return value?.trim().toLowerCase()??""}
export function googleEmailDomain(value:string){const at=value.lastIndexOf("@");return at>0?value.slice(at+1):""}
export function isSchoolGoogleEmail(email:string,allowedDomain:string|undefined){const domain=allowedDomain?.trim().toLowerCase();return Boolean(domain&&googleEmailDomain(email)===domain)}
export function validApprovalEmail(value:string){return value.length>=3&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
