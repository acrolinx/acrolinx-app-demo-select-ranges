import * as _ from 'lodash';

type TypedEventListener<T> = (event: T) => void;


export interface DispatchOptions<T> {
  noDispatchTo?: TypedEventListener<T>;
}

export class TypedEventEmitter<T> {
  private listener: Array<TypedEventListener<T>> = [];

  public addEventListener(listener: TypedEventListener<T>) {
    this.listener.push(listener);
  }

  public removeEventListener(listener: TypedEventListener<T>) {
    _.pull(this.listener, listener);
  }

  public dispatchEvent(event: T, opts: DispatchOptions<T> = {}) {
    this.listener.forEach((listener) => {
      if (!opts.noDispatchTo || listener !== opts.noDispatchTo) {
        listener(event);
      }
    });
  }
}

