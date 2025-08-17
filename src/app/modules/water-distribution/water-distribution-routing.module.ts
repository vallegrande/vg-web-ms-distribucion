import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProgramListComponent } from './components/program-list/program-list.component';
import { ProgramFormComponent } from './components/program-form/program-form.component';
import { ProgramDetailComponent } from './components/program-detail/program-detail.component';

const routes: Routes = [
  {
    path: '',
    component: ProgramListComponent
  },
  {
    path: 'new',
    component: ProgramFormComponent
  },
  {
    path: 'edit/:id',
    component: ProgramFormComponent
  },
  {
    path: 'view/:id',
    component: ProgramDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class WaterDistributionRoutingModule { }
