/*
Copyright 2022 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

/*
 *ngFor="let c of oneDimArray | sortBy:'asc'"
 *ngFor="let c of arrayOfObjects | sortBy:'asc':'propertyName'"
*/
import { Pipe, PipeTransform } from '@angular/core';
import { orderBy } from 'lodash';

@Pipe({ name: 'sortBy' })
export class SortByPipe implements PipeTransform {

  transform(value: any[], order = '', column: string = ''): any[] {
    // no array
    if (!value || order === '' || !order) { return value; }
    // array with only one item
    if (value.length <= 1) { return value; }
    // sort 1d array
    if (!column || column === '') {
      if (order === 'asc') {
        return value.sort();
      } else {
        return value.sort().reverse();
      }
    }
    // sort array of objects
    return orderBy(value, [column], [order]);
  }
}

@Pipe({ name: 'displayOrder' })
export class DisplayOrderPipe implements PipeTransform {

  transform(value: any[]): any[] {
    // check for valid array
    if (!value || value.length < 2) {
      return value;
    }
    // sort by displayOrder
    var temp = value.map(x => x);
    return temp.sort((a: any, b: any) =>
      (a.displayOrder - b.displayOrder)
    );
  }
}
