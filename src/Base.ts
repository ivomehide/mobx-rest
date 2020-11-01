import Request from './Request'
import ErrorObject from './ErrorObject'
import apiClient from './apiClient'
import includes from 'lodash/includes'
import isObject from 'lodash/isObject'
import {action, observable, IObservableArray, runInAction, makeObservable} from 'mobx'

export default class Base {
  request: Request | null = null
  requests: IObservableArray<Request> = observable.array([])

  constructor() {
    makeObservable<Base>(this, {
      request: observable,
      //requests: observable.shallow,
      rpc: action
    })
  }

  /**
   * Returns the resource's url.
   *
   * @abstract
   */
  url (): string {
    throw new Error('You must implement this method')
  }

  withRequest (
    labels: string | Array<string>,
    promise: Promise<any>,
    abort: () => void | null
  ): Request {
    if (typeof labels === 'string') {
      labels = [labels]
    }

    const handledPromise = promise
      .then(response => {
        if (this.request === request) this.request = null
        runInAction(() => {
          this.requests.remove(request)
        })

        return response
      })
      .catch(error => {
        runInAction(() => {
          this.requests.remove(request)
        })

        throw new ErrorObject(error)
      })

    const request = new Request(handledPromise, {
      labels,
      abort
    })

    this.request = request
    this.requests.push(request)

    return request
  }

  getRequest (label: string): Request | null {
    return this.requests.find(request => includes(request.labels, label))
  }

  getAllRequests (label: string): Array<Request> {
    return this.requests.filter(request => includes(request.labels, label))
  }

  /**
   * Questions whether the request exists
   * and matches a certain label
   */
  isRequest (label: string): boolean {
    return !!this.getRequest(label)
  }

  /**
   * Call an RPC action for all those
   * non-REST endpoints that you may have in
   * your API.
   */
  rpc (endpoint: string | { rootUrl: string }, options?: {}, label: string = 'calling'): Request {
    const url = isObject(endpoint) ? endpoint.rootUrl : `${this.url()}/${endpoint}`
    const { promise, abort } = apiClient().post(url, options)

    return this.withRequest(label, promise, abort)
  }
}
