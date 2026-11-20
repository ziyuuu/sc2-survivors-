import type {DoomsdayId} from './terran-doomsday';
/** Reuse the approved original paintings and object sheet in the existing card face. */
export const DOOMSDAY_CARD_ART:Record<DoomsdayId,{identity?:string;sprite:number;bodies?:number;identities?:string[]}>={
 'M-W01':{sprite:0},'M-W02':{identity:'hellion',sprite:10},'M-W03':{sprite:0},'M-W04':{identity:'science_vessel',sprite:4},'M-W05':{identity:'marine',sprite:0},'M-W06':{sprite:1},'M-W07':{identity:'tank',sprite:6},'M-W08':{identity:'marine',identities:['marine','tank'],bodies:2,sprite:1},'M-W09':{sprite:5},
 'M-G01':{sprite:0},'M-G02':{sprite:1},'M-G03':{sprite:6},'M-G04':{identity:'marine',identities:['marine','tank'],bodies:2,sprite:4},'M-G05':{identity:'tank',bodies:2,sprite:4},'M-G06':{identity:'hellion',sprite:10},'M-G07':{sprite:3},'M-G08':{sprite:7},'M-G09':{sprite:1},
 'M-B01':{sprite:1},'M-B02':{sprite:9},'M-B03':{sprite:14},'M-B04':{sprite:1},'M-B05':{sprite:12},'M-B06':{sprite:14},'M-B07':{identity:'viking',sprite:14},'M-B08':{identity:'thor',sprite:9},'M-B09':{sprite:13},
 'M-P01':{identity:'tank.3',sprite:6},'M-P02':{sprite:0},'M-P03':{identity:'marine',sprite:1},'M-P04':{sprite:5},'M-P05':{identity:'tank',sprite:9},'M-P06':{identity:'banshee',sprite:14},
 'M-N01':{identity:'science_vessel',sprite:4},'M-N02':{sprite:1},'M-N03':{identity:'thor.3',sprite:6},'M-N04':{identity:'marine',bodies:3,sprite:0},'M-N05':{identity:'marine',bodies:2,sprite:0},'M-N06':{identity:'tank',sprite:9},'M-N07':{identity:'hellion',identities:['hellion','tank'],bodies:2,sprite:10},'M-N08':{identity:'viking',identities:['viking','banshee'],bodies:2,sprite:14},'M-N09':{identity:'banshee',sprite:12},
 'M-O01':{identity:'thor',sprite:1},'M-O02':{identity:'thor',sprite:14},'M-O03':{identity:'tank',sprite:9},
};
