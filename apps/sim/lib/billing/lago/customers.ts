import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { callLago, LagoApiError, lagoRequest } from '@/lib/billing/lago/client'
import { toLagoCustomerExternalId } from '@/lib/billing/lago/external-ids'
import type {
  LagoBillingEntityType,
  LagoCheckoutUrlResponse,
  LagoCustomerPayload,
  LagoCustomerResponse,
  LagoPortalUrlResponse,
} from '@/lib/billing/lago/types'

const logger = createLogger('LagoCustomers')

interface UpsertLagoCustomerParams {
  entityType: LagoBillingEntityType
  entityId: string
  name?: string | null
  email?: string | null
}

/**
 * Creates or updates a Lago customer for a Sim billing entity.
 */
export async function upsertLagoCustomer(
  params: UpsertLagoCustomerParams
): Promise<LagoCustomerResponse['customer']> {
  const externalId = toLagoCustomerExternalId(params.entityType, params.entityId)
  const payload: { customer: LagoCustomerPayload } = {
    customer: {
      external_id: externalId,
      name: params.name ?? undefined,
      email: params.email ?? undefined,
      currency: 'USD',
    },
  }

  try {
    const created = await callLago((client) =>
      client.customers.createCustomer({
        customer: {
          external_id: externalId,
          name: params.name ?? undefined,
          email: params.email ?? undefined,
          currency: 'USD',
        },
      })
    )
    return created.customer as LagoCustomerResponse['customer']
  } catch (error) {
    if (error instanceof LagoApiError && error.status === 422) {
      const updated = await lagoRequest<LagoCustomerResponse>(
        'PUT',
        `/customers/${encodeURIComponent(externalId)}`,
        payload
      )
      return updated.customer
    }
    throw error
  }
}

/**
 * Returns a hosted checkout URL so the customer can add a payment method.
 */
export async function getLagoCheckoutUrl(
  entityType: LagoBillingEntityType,
  entityId: string
): Promise<string | null> {
  const externalId = toLagoCustomerExternalId(entityType, entityId)
  try {
    const response = await callLago((client) =>
      client.customers.generateCustomerCheckoutUrl(externalId)
    )
    return (response as LagoCheckoutUrlResponse).customer.checkout_url ?? null
  } catch (error) {
    logger.error('Failed to create Lago checkout URL', {
      externalId,
      error: getErrorMessage(error),
    })
    return null
  }
}

/**
 * Returns a hosted customer portal URL for managing billing.
 */
export async function getLagoPortalUrl(
  entityType: LagoBillingEntityType,
  entityId: string
): Promise<string | null> {
  const externalId = toLagoCustomerExternalId(entityType, entityId)
  try {
    const response = await callLago((client) => client.customers.getCustomerPortalUrl(externalId))
    return (response as LagoPortalUrlResponse).customer.portal_url ?? null
  } catch (error) {
    logger.error('Failed to create Lago portal URL', {
      externalId,
      error: getErrorMessage(error),
    })
    return null
  }
}
