/**
 * Accounting API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 2.0.0
 * Contact: api@xero.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { InvoiceReminder } from './invoiceReminder';

export class InvoiceReminders {
    'invoiceReminders'?: Array<InvoiceReminder>;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "invoiceReminders",
            "baseName": "InvoiceReminders",
            "type": "Array<InvoiceReminder>"
        }    ];

    static getAttributeTypeMap() {
        return InvoiceReminders.attributeTypeMap;
    }
}

