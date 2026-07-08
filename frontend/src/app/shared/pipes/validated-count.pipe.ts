import { Pipe, PipeTransform } from '@angular/core';
import { Field } from '../../core/services/scan.service';

@Pipe({
  name: 'validatedCount',
  standalone: true,
  pure: false,
})
export class ValidatedCountPipe implements PipeTransform {
  transform(fields: Field[]): number {
    if (!fields || fields.length === 0) return 0;
    return fields.filter(f => f.is_validated).length;
  }
}