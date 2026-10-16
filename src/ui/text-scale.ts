import {displayPreferences,setDisplayPreferences} from './display-preferences';
export function textScale(){return displayPreferences().textScale;}
export function setTextScale(value:number){setDisplayPreferences({textScale:value});}
