import {buildingViewState} from '../../simulation/building/expedition';
import {renderBuildingPlacement} from './building-panel';
import type {World} from '../../simulation/world';

export function productionFacilities(w:World){const state=buildingViewState(w);return state?renderBuildingPlacement(state,undefined,{close:'ui-back',apply:'building-panel-apply',output:'building-output',enable:'building-enable'}):'';}
