import React from 'react'
import usePermissionStore from '../../stores/permissionStore'

interface AuthorizedProps {
  permission: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const Authorized: React.FC<AuthorizedProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const hasPermission = usePermissionStore((s) => s.hasPermission)
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>
}

export const usePermission = () => {
  const hasPermission = usePermissionStore((s) => s.hasPermission)
  const hasMenuPermission = usePermissionStore((s) => s.hasMenuPermission)
  const permissions = usePermissionStore((s) => s.permissions)
  return { hasPermission, hasMenuPermission, permissions }
}

export default Authorized
