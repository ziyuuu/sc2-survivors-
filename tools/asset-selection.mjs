/** Model IDs are exact; only effect texture layers are replaced as a family. */
export const replacedBySelection=(assetId,selected)=>[...selected].some(id=>assetId===id||id.startsWith('fx.')&&assetId.startsWith(id+'.'));
