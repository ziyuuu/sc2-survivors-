import fs from 'node:fs/promises';
const b=JSON.parse(await fs.readFile('reports/local/performance-a01-20261020/board-before.json','utf8'));
const source=await fs.readFile('reports/local/performance-audit-review-20261019/全项目性能审计与问题总表.md','utf8');
const sections=source.split(/(?=^#### )/m);
const groups={
  simulation:['SIM-002','SIM-017','SIM-018','SIM-019','SIM-023','FX-009','FX-010','FX-018','FX-019','FX-021','C02','C21','R01','R02','R03','R04','R06','R15','SIM-008'],
  loading:['LOAD-001','LOAD-002','LOAD-003','LOAD-004','LOAD-005','LOAD-007','LOAD-008','LOAD-009','LOAD-010','LOAD-011','LOAD-012','LOAD-014','LOAD-017','LOAD-019','L01','L03','L06','L12','L13','DATA-001'],
  save:['SAVE-001','SAVE-002','SAVE-003','SAVE-004','SAVE-009','SAVE-010','PG-017','PG-018','PST-001','PST-002'],
  other:['GATE-001','GATE-002','GATE-003','GATE-004','GATE-005','GATE-006','GATE-007','GATE-008','L09','L10','L11','B01','B02','B03','B04','B05','B06','B07','B08','B09'],
};
const arg=process.argv[2]??'simulation';
for(const id of groups[arg]??[]){
 const section=sections.find(s=>s.startsWith(`#### ${id}｜`));
 console.log(section??`MISSING ${id}`);
}
