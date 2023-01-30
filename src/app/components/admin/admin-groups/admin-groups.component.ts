// Copyright 2022 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license, please see LICENSE.md in the project root for license information or contact permission@sei.cmu.edu for full terms.

import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Sort } from '@angular/material/sort';
import { Group, Team, ItemStatus} from 'src/app/generated/cite.api/model/models';
import { GroupDataService } from 'src/app/data/group/group-data.service';
import { GroupQuery } from 'src/app/data/group/group.query';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-groups',
  templateUrl: './admin-groups.component.html',
  styleUrls: ['./admin-groups.component.scss'],
})
export class AdminGroupsComponent implements OnInit, OnDestroy {
  @Input() pageSize: number;
  @Input() pageIndex: number;
  @Input() teamList: Team[];
  @Output() sortChange = new EventEmitter<Sort>();
  @Output() pageChange = new EventEmitter<PageEvent>();
  filterControl: UntypedFormControl = this.groupDataService.filterControl;
  filterString = '';
  newGroup: Group = { id: '', name: '' };
  groupList: Group[];
  isLoading = false;
  topbarColor = '#ef3a47';
  addingNewGroup = false;
  newGroupName = '';
  editGroup: Group = {};
  originalGroupName = '';
  originalGroupShortName = '';
  private unsubscribe$ = new Subject();

  constructor(
    private settingsService: ComnSettingsService,
    private groupDataService: GroupDataService,
    private groupQuery: GroupQuery
  ) {
    this.topbarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topbarColor;
    this.groupQuery.selectAll().pipe(takeUntil(this.unsubscribe$)).subscribe(groups => {
      this.groupList = [];
      groups.forEach(group => {
        this.groupList.push({ ...group });
        if (group.id === this.editGroup.id) {
          this.originalGroupName = group.name;
          this.editGroup = { ...group};
        }
      });
    });
    this.groupDataService.load();
  }

  ngOnInit() {
    this.filterControl.setValue(this.filterString);
  }

  addGroup() {
    this.newGroupName = '';
    this.addingNewGroup = true;
  }

  togglePanel(group: Group) {
    this.editGroup = this.editGroup.id === group.id ? this.editGroup = {} : this.editGroup = { ...group};
  }

  cancelGroupAdd() {
    this.addingNewGroup = false;
    this.newGroupName = '';
  }

  saveNewGroup() {
    const newGroup = {
      name: this.newGroupName
    };
    this.groupDataService.add(newGroup);
    this.newGroupName = '';
    this.addingNewGroup = false;
  }

  selectGroup(group: Group) {
    this.editGroup = { ...group };
    this.originalGroupName = group.name;
    return false;
  }

  saveGroup() {
    this.groupDataService.updateGroup(this.editGroup);
  }

  cancelEdit() {
    this.editGroup.name = this.originalGroupName;
  }

  applyFilter(filterValue: string) {
    this.filterControl.setValue(filterValue);
  }

  sortChanged(sort: Sort) {
    this.sortChange.emit(sort);
  }

  paginatorEvent(page: PageEvent) {
    this.pageChange.emit(page);
  }

  paginateGroups(groups: Group[], pageIndex: number, pageSize: number) {
    if (!groups) {
      return [];
    }
    const startIndex = pageIndex * pageSize;
    const copy = groups.slice();
    return copy.splice(startIndex, pageSize);
  }

  handleInput(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case 'Tab':
        if (this.addingNewGroup) {
          this.saveNewGroup();
        } else if (!!this.editGroup.id) {
          this.saveGroup();
        }
        break;
      case 'Escape':
        if (this.addingNewGroup) {
          this.cancelGroupAdd();
        } else if (!!this.editGroup.id) {
          this.cancelEdit();
        }
        break;
      default:
        break;
    }
    event.stopPropagation();
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

}
