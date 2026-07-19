'use client'

import { useCallback, useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  toast,
} from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useSession } from '@/lib/auth/auth-client'
import { isEnterprise } from '@/lib/billing/plan-helpers'
import { isBillingEnabled } from '@/lib/core/config/env-flags'
import { quickValidateEmail } from '@/lib/messaging/email/validation'
import type { PermissionType } from '@/lib/workspaces/permissions/utils'
import { useWorkspaceHostContext } from '@/app/workspace/[workspaceId]/providers/workspace-host-provider'
import { useWorkspacePermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import { useBatchSendWorkspaceInvitations } from '@/hooks/queries/invitations'
import { useOrganizationBilling } from '@/hooks/queries/organization'

const logger = createLogger('InviteModal')

function getRoleOptions(tI18n: ReturnType<typeof useTranslations>) {
  return [
    { value: 'admin', label: tI18n('admin') },
    { value: 'write', label: tI18n('write') },
    { value: 'read', label: tI18n('read') },
  ] as const
}

interface InviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceName?: string
  inviteDisabledReason?: string | null
  organizationId?: string | null
}

export function InviteModal({
  open,
  onOpenChange,
  workspaceName,
  inviteDisabledReason = null,
  organizationId = null,
}: InviteModalProps) {
  const tI18n = useTranslations('auto')
  const ROLE_OPTIONS = getRoleOptions(tI18n)
  const [emails, setEmails] = useState<string[]>([])
  const [inviteRole, setInviteRole] = useState<PermissionType>('admin')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const params = useParams()
  const workspaceId = params.workspaceId as string

  const { data: session } = useSession()
  const hostContext = useWorkspaceHostContext()
  const { workspacePermissions, userPermissions: userPerms } = useWorkspacePermissionsContext()
  const canViewOrganizationBilling =
    Boolean(organizationId) &&
    hostContext.hostOrganizationId === organizationId &&
    hostContext.viewer.isHostOrganizationAdmin

  const { data: organizationBillingData } = useOrganizationBilling(organizationId ?? '', {
    enabled: open && isBillingEnabled && canViewOrganizationBilling,
  })

  const batchSendInvitations = useBatchSendWorkspaceInvitations()

  const canInviteMembers = userPerms.canAdmin && !inviteDisabledReason
  const isSubmitting = batchSendInvitations.isPending

  const totalSeats = organizationBillingData?.data?.totalSeats ?? 0
  const usedSeats = organizationBillingData?.data?.usedSeats ?? 0
  const availableSeats = Math.max(0, totalSeats - usedSeats)
  // Only Enterprise plans have a fixed seat cap that gates invites. Team/Pro
  // seats are provisioned automatically when an invitee accepts.
  const isEnterpriseOrg = isEnterprise(organizationBillingData?.data?.subscriptionPlan)
  const hasSeatData = canViewOrganizationBilling && isEnterpriseOrg && totalSeats > 0
  const exceedsSeatCapacity = hasSeatData && userPerms.canAdmin && emails.length > availableSeats
  const seatLimitReason = exceedsSeatCapacity
    ? tI18n('only_n_seats_available', { count: availableSeats })
    : null

  const validateEmail = useCallback(
    (email: string): string | null => {
      const formatResult = quickValidateEmail(email)
      if (!formatResult.isValid) {
        return formatResult.reason ?? tI18n('invalid_email')
      }
      if (workspacePermissions?.users?.some((user) => user.email === email)) {
        return tI18n('email_already_teammate')
      }
      if (session?.user?.email && session.user.email.toLowerCase() === email) {
        return tI18n('cannot_invite_yourself')
      }
      return null
    },
    [workspacePermissions?.users, session?.user?.email, tI18n]
  )

  const handleEmailsChange = useCallback((next: string[]) => {
    setEmails(next)
    setErrorMessage(null)
  }, [])

  const handleSendInvites = useCallback(() => {
    setErrorMessage(null)
    if (!canInviteMembers || emails.length === 0 || !workspaceId) return

    const invitations = emails.map((email) => ({ email, permission: inviteRole }))

    batchSendInvitations.mutate(
      { workspaceId, organizationId, invitations },
      {
        onSuccess: (result) => {
          const parts: string[] = []
          if (result.added.length > 0) {
            parts.push(tI18n('n_members_added', { count: result.added.length }))
          }
          if (result.successful.length > 0) {
            parts.push(tI18n('n_invites_sent', { count: result.successful.length }))
          }
          if (parts.length > 0) {
            toast.success(parts.join(' · '))
          }

          if (result.failed.length > 0) {
            // Keep the failed addresses in the field with the error for retry.
            setEmails(result.failed.map((f) => f.email))
            setErrorMessage(
              result.failed.length === 1
                ? result.failed[0].error
                : tI18n('n_invitations_failed', {
                    count: result.failed.length,
                    error: result.failed[0].error,
                  })
            )
            return
          }

          setEmails([])
          onOpenChange(false)
        },
        onError: (error) => {
          logger.error('Error inviting teammates:', error)
          setErrorMessage(error.message || 'An unexpected error occurred. Please try again.')
        },
      }
    )
  }, [
    canInviteMembers,
    emails,
    workspaceId,
    organizationId,
    inviteRole,
    batchSendInvitations,
    onOpenChange,
  ])

  const resetState = useCallback(() => {
    setEmails([])
    setInviteRole('admin')
    setErrorMessage(null)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetState()
      onOpenChange(next)
    },
    [onOpenChange, resetState]
  )

  const isSendDisabled =
    !canInviteMembers || isSubmitting || !workspaceId || emails.length === 0 || exceedsSeatCapacity

  const fieldHint = inviteDisabledReason ?? seatLimitReason

  return (
    <ChipModal
      open={open}
      onOpenChange={handleOpenChange}
      srTitle={tI18n('invite_teammates_to_workspace', { workspace: workspaceName || 'workspace' })}
    >
      <ChipModalHeader onClose={() => handleOpenChange(false)}>
        {tI18n('invite_teammates')}
      </ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='emails'
          title={tI18n('emails')}
          value={emails}
          onChange={handleEmailsChange}
          validate={validateEmail}
          error={errorMessage}
          hint={fieldHint}
          placeholder={
            !canInviteMembers
              ? inviteDisabledReason || tI18n('only_admins_can_invite')
              : tI18n('enter_emails')
          }
          disabled={isSubmitting || !canInviteMembers}
        />
        <ChipModalField
          type='dropdown'
          title={tI18n('invite_as')}
          options={ROLE_OPTIONS}
          value={inviteRole}
          placeholder={tI18n('select_role')}
          align='start'
          onChange={(role) => setInviteRole(role as PermissionType)}
        />
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => handleOpenChange(false)}
        cancelDisabled={isSubmitting}
        primaryAction={{
          label: isSubmitting ? tI18n('sending') : tI18n('send_invites'),
          onClick: handleSendInvites,
          disabled: isSendDisabled,
        }}
      />
    </ChipModal>
  )
}
