import * as React from "react"

import { ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & { 
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

type ActionType = typeof actionTypes

type Action = 
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: ToasterToast["id"] }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: ToasterToast["id"] }

interface State { 
  toasts: ToasterToast[]
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case actionTypes.DISMISS_TOAST:
      const { toastId } = action

      // ! Side effects ! - This means all toasts will be dismissed.
      // Should be used with a clear button as the action for the toast.
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId ? { ...t, open: false } : t
        ),
      }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
    default:
      return state
  }
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function useToast() {
  const [state, dispatch] = React.useReducer(reducer, { toasts: [] })

  const addToast = React.useCallback(
    (toast: ToasterToast) => {
      dispatch({ type: actionTypes.ADD_TOAST, toast })
    },
    [dispatch]
  )

  const updateToast = React.useCallback(
    (toast: Partial<ToasterToast>) => {
      dispatch({ type: actionTypes.UPDATE_TOAST, toast })
    },
    [dispatch]
  )

  const dismissToast = React.useCallback(
    (toastId?: ToasterToast["id"]) => {
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId })
    },
    [dispatch]
  )

  const removeToast = React.useCallback(
    (toastId?: ToasterToast["id"]) => {
      dispatch({ type: actionTypes.REMOVE_TOAST, toastId })
    },
    [dispatch]
  )

  React.useEffect(() => {
    state.toasts.forEach((toast) => {
      if (toast.open === false) {
        // We need to remove visible toasts after the dismiss animation finishes
        setTimeout(() => {
          removeToast(toast.id)
        }, TOAST_REMOVE_DELAY)
      }
    })
  }, [state.toasts, removeToast])

  const toast = React.useCallback(
    ({ ...props }: ToastProps) => {
      const id = generateId()

      const update = (props: Partial<ToasterToast>) =>
        updateToast({ id, ...props })
      const dismiss = () => dismissToast(id)

      addToast({
        id,
        open: true,
        onOpenChange: (open) => {
          if (!open) dismiss()
        },
        ...props,
      })

      return { id, update, dismiss }
    },
    [addToast, updateToast, dismissToast]
  )

  return { ...state, toast, dismiss: dismissToast }
}

export { useToast }
