export class HttpError extends Error {
  constructor(public status:number,message:string,public revision?:number) { super(message) }
}
export function ensure(condition:unknown,status:number,message:string):asserts condition {
  if(!condition) throw new HttpError(status,message)
}
export function uniqueError(error:unknown):boolean { return /UNIQUE constraint failed/.test(String((error as Error)?.message)) }
