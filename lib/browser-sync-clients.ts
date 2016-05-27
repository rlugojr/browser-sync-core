export enum GlobalClientEvents {
    reload = <any>"Global.reload"
}

export interface GlobalReloadEvent {
    force: boolean
}
