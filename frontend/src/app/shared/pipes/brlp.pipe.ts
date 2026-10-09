import { Pipe, PipeTransform } from '@angular/core';
import { baseUnitsToBrl } from '../utils/money';

@Pipe({
  name: 'brlp',
  standalone: true,
  pure: true,
})
export class BrlpPipe implements PipeTransform {
  transform(baseUnits: string): string {
    return baseUnitsToBrl(baseUnits);
  }
}
