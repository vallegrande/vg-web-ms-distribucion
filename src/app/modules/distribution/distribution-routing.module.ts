import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoutesListComponent } from './components/routes/routes-list/routes-list.component';
import { RoutesFormComponent } from './components/routes/routes-form/routes-form.component';

const routes: Routes = [
  {
    path: 'routes',
    children: [
      { path: '', component: RoutesListComponent },
      { path: 'new', component: RoutesFormComponent },
      { path: 'edit/:id', component: RoutesFormComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DistributionRoutingModule { }
