export interface HighLevelPage<T>{contacts?:T[];opportunities?:T[];events?:T[];calendars?:T[];locations?:T[];meta?:{nextPageUrl?:string;nextPage?:number;total?:number}}
export interface HighLevelContact{id:string;locationId?:string;firstName?:string;lastName?:string;name?:string;email?:string;phone?:string;companyName?:string;source?:string;tags?:string[];customFields?:Array<{id?:string;key?:string;value?:unknown}>;dateAdded?:string;dateUpdated?:string;[key:string]:unknown}
export interface HighLevelOpportunity{id:string;locationId?:string;contactId?:string;pipelineId?:string;pipelineStageId?:string;name?:string;status?:string;monetaryValue?:number;[key:string]:unknown}
export interface HighLevelAppointment{id:string;locationId?:string;contactId?:string;calendarId?:string;title?:string;startTime?:string;endTime?:string;appointmentStatus?:string;[key:string]:unknown}
export interface HighLevelTokenResponse{access_token:string;refresh_token?:string;expires_in?:number;locationId?:string;companyId?:string;userType?:string}

