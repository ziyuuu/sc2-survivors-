/** Approved armed-card compositions from existing approved card paintings, not new SC2 assets. */
export const ARMED_CARD_ART:Record<string,{identity:string;bodies:number;identities?:string[]}>={
 W01:{identity:'marine',bodies:3},W02:{identity:'marine',bodies:1},
 G03:{identity:'marine',bodies:2},G05:{identity:'hellion',bodies:3},G06:{identity:'zergling',bodies:3},
 B03:{identity:'reaper',bodies:4},B05:{identity:'marine',bodies:6},B08:{identity:'tank',bodies:1},
 P02:{identity:'thor.1',bodies:3,identities:['thor.1','thor.2','thor.3']},
 N03:{identity:'reaper',bodies:2,identities:['reaper','reaper.1']},
};
